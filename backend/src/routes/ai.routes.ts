import { Router } from 'express';
import { testAI, summarizeText, formatForPlatform, formatForAllPlatforms, getAIUsage } from '../controllers/ai-simple.controller';
import { optionalAuth } from '../middleware/mongodb-auth';
import { logger } from '../config/logger';

export const aiRouter = Router();

logger.info('AI routes module loaded');

// AI text processing routes
aiRouter.get('/test', testAI);
aiRouter.post('/summarize', optionalAuth, summarizeText);
aiRouter.post('/format', optionalAuth, formatForPlatform);
aiRouter.post('/format-all', optionalAuth, formatForAllPlatforms);
aiRouter.get('/usage', optionalAuth, getAIUsage);
