import { Router } from 'express';
import { 
  getOfflineTranscripts,
  syncOfflineTranscripts,
  getSyncStatus,
  resolveSyncConflicts,
  getAppConfig,
  mobileHealthCheck
} from '../controllers/mobile-sync.controller';
import { authenticate } from '../middleware/mongodb-auth';

const router = Router();

// Health check (no auth required)
router.get('/health', mobileHealthCheck);

// App configuration (no auth required for basic config)
router.get('/config', getAppConfig);

// All other routes require authentication
router.use(authenticate);

// Offline sync endpoints
router.get('/offline/transcripts', getOfflineTranscripts);
router.post('/offline/sync', syncOfflineTranscripts);
router.get('/sync/status', getSyncStatus);
router.post('/sync/resolve-conflicts', resolveSyncConflicts);

export default router;

