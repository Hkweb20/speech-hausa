import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initSockets } from './sockets';

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
initSockets(io);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server listening');
});

