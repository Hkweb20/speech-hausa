import { Router } from 'express';
import { getAvailableLanguages } from '../controllers/admin-languages.controller';

const router = Router();

// Public endpoint to get available languages (no authentication required)
router.get('/available', getAvailableLanguages);

export default router;
