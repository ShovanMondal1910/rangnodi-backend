import { pool } from '../config/database';

async function runMigration() {
  console.log('--- Dropping avatar varchar column and ensuring avatar_blob BYTEA & avatar_mime ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Drop old avatar varchar column
    await client.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS avatar;
    `);

    // 2. Ensure avatar_blob and avatar_mime exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar_blob BYTEA DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS avatar_mime VARCHAR(50) DEFAULT 'image/jpeg';
    `);

    await client.query('COMMIT');
    console.log('Successfully dropped avatar column and ensured avatar_blob + avatar_mime.');

    // 3. Inspect columns of users
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    console.log('Current users table schema:');
    res.rows.forEach(col => {
      console.log(` - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
