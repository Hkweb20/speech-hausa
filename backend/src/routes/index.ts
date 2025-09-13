import { Router } from 'express';
import { healthRouter } from './health.routes';
import { transcriptsRouter } from './transcripts.routes';
import authRoutes from './mongodb-auth.routes';
import pointsRoutes from './points.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/api', transcriptsRouter);
apiRouter.use('/api/auth', authRoutes);
apiRouter.use('/api/points', pointsRoutes);

