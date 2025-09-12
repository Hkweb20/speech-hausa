import { Router } from 'express';
import { healthRouter } from './health.routes';
import { transcriptsRouter } from './transcripts.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/api', transcriptsRouter);

