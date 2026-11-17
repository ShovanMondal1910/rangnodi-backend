import createApp from './app';
import { config } from './config/environment';
import { connectDB, pool } from './config/database';

const startServer = async () => {
  try {
    // Connect to PostgreSQL Database
    await connectDB();

    const app = createApp();

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`=================================`);
      console.log(`🚀 Rangnodi Backend Server Running`);
      console.log(`📡 Environment: ${config.env}`);
      console.log(`🌐 Port: ${config.port}`);
      console.log(`🔗 URL: http://localhost:${config.port}`);
      console.log(`🗄️ Database: ${config.db.database}`);
      console.log(`=================================`);
    });

    const handleShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await pool.end();
          console.log('Database pool closed.');
        } catch (err) {
          console.error('Error closing database pool:', err);
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
