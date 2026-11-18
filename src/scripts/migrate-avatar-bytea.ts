import { pool } from '../config/database';

async function runMigration() {
  console.log('--- Starting Avatar BYTEA Migration on users table ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add avatar_blob and avatar_mime if they do not exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar_blob BYTEA DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS avatar_mime VARCHAR(50) DEFAULT 'image/jpeg';
    `);

    console.log('Successfully ensured avatar_blob BYTEA and avatar_mime VARCHAR(50) columns on users table.');

    // 2. Commit transaction
    await client.query('COMMIT');
    console.log('--- Migration Committed Successfully! ---');

    // 3. Inspect columns
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name LIKE 'avatar%'
    `);
    console.log('Current avatar columns in users table:', res.rows);
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
