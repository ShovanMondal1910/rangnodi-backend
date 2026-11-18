import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './environment';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const connectDB = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), current_user, version()');
    client.release();
    console.log(`Connected to PostgreSQL Database: ${res.rows[0].current_database} as user: ${res.rows[0].current_user}`);
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
};

export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export default pool;
