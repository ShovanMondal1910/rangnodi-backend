import createApp from './app';
import { config } from './config/environment';

const app = createApp();

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`=================================`);
  console.log(`🚀 Rangnodi Backend Server Running`);
  console.log(`📡 Environment: ${config.env}`);
  console.log(`🌐 Port: ${config.port}`);
  console.log(`🔗 URL: http://localhost:${config.port}`);
  console.log(`=================================`);
});

const handleShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
