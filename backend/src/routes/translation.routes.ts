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
translationRouter.post('/translate', optionalAuth, translateText);
translationRouter.post('/tts', optionalAuth, textToSpeech);
translationRouter.post('/translate-and-speak', optionalAuth, translateAndSpeak);
translationRouter.get('/voices/:languageCode', optionalAuth, getAvailableVoices);
translationRouter.get('/languages', optionalAuth, getSupportedLanguages);

logger.info('Translation routes registered');

