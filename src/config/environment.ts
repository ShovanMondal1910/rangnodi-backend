import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '715933900876-2bnser23sifg84c6uh02uit8j7mic37g.apps.googleusercontent.com',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'Rangnodi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1910',
    ssl: process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost'),
  },
};
