import { Router } from 'express';
import { 
  translateText, 
  textToSpeech, 
  translateAndSpeak, 
  getAvailableVoices, 
  getSupportedLanguages 
} from '../controllers/translation.controller';
import { optionalAuth } from '../middleware/mongodb-auth';
import { logger } from '../config/logger';

export const translationRouter = Router();

logger.info('Translation routes module loaded');

// Translation routes
translationRouter.post('/translate', optionalAuth as any, translateText);
translationRouter.post('/tts', optionalAuth as any, textToSpeech);
translationRouter.post('/translate-and-speak', optionalAuth as any, translateAndSpeak);
translationRouter.get('/voices/:languageCode', optionalAuth as any, getAvailableVoices);
translationRouter.get('/languages', optionalAuth as any, getSupportedLanguages);

logger.info('Translation routes registered');

