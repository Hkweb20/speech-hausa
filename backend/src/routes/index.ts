import { Router } from 'express';
import { healthRouter } from './health.routes';
import { transcriptsRouter } from './transcripts.routes';
import authRoutes from './mongodb-auth.routes';
import pointsRoutes from './points.routes';
import { aiRouter } from './ai.routes';
import { translationRouter } from './translation.routes';
import usageRoutes from './usage.routes';
import adminRoutes from './admin.routes';
import languagesRoutes from './languages.routes';
import { logger } from '../config/logger';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/api', transcriptsRouter);
apiRouter.use('/api/auth', authRoutes);
apiRouter.use('/api/points', pointsRoutes);
apiRouter.use('/api/ai', aiRouter);
apiRouter.use('/api/translation', translationRouter);
apiRouter.use('/api/usage', usageRoutes);
apiRouter.use('/api/languages', languagesRoutes);
apiRouter.use('/api/admin', adminRoutes);

logger.info('AI routes registered at /api/ai');
logger.info('Translation routes registered at /api/translation');
logger.info('Usage routes registered at /api/usage');
logger.info('Admin routes registered at /api/admin');

