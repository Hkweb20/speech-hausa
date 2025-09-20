import { Router } from 'express';
import { getAvailableLanguages, testDatabaseConnection } from '../controllers/admin-languages.controller';

const router = Router();

// Test endpoint
router.get('/test', testDatabaseConnection);

// Public endpoint to get available languages (no authentication required)
router.get('/available', getAvailableLanguages);

export default router;
