import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import fs from 'fs';
import pinoHttp from 'pino-http';
import { apiRouter } from './routes';
import { requestId } from './middleware/requestId';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';

const path = require('path');
const openApiPathDist = path.join(__dirname, 'docs', 'openapi.yaml');
const openApiPathSrc = path.join(process.cwd(), 'src', 'docs', 'openapi.yaml');
const openApiDocument = YAML.load(require('fs').existsSync(openApiPathDist) ? openApiPathDist : openApiPathSrc);

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(pinoHttp({ logger }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-hashes'", 'https://cdn.socket.io', 'blob:'],
          "script-src-elem": ["'self'", "'unsafe-inline'", "'unsafe-hashes'", 'https://cdn.socket.io', 'blob:'],
          "script-src-attr": ["'unsafe-inline'", "'unsafe-hashes'"],
          "connect-src": ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
          "media-src": ["'self'", 'blob:', 'data:'],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", 'data:'],
          "worker-src": ["'self'", 'blob:'],
          "object-src": ["'none'"],
        },
      },
    })
  );
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve static test page if present
  const staticDirCandidate1 = path.resolve(__dirname, '..', 'public');
  const staticDirCandidate2 = path.resolve(process.cwd(), 'public');
  const staticDir = fs.existsSync(staticDirCandidate1)
    ? staticDirCandidate1
    : fs.existsSync(staticDirCandidate2)
    ? staticDirCandidate2
    : undefined;
  if (staticDir) {
    app.use(express.static(staticDir));
  }

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use('/', apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

