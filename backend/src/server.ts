import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { databaseService } from './config/database';
import { initSockets } from './sockets';

async function startServer() {
  try {
    // Connect to database
    await databaseService.connect();
    
    const app = createApp();
    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });
    initSockets(io);

    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'Server listening');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        databaseService.disconnect().then(() => {
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        databaseService.disconnect().then(() => {
          process.exit(0);
        });
      });
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

