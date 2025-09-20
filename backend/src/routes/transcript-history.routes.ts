import { Router } from 'express';
import { 
  getRecentTranscripts, 
  searchTranscripts, 
  getTranscriptById, 
  updateTranscript, 
  deleteTranscript, 
  exportTranscripts, 
  getTranscriptStats 
} from '../controllers/transcript-history.controller';
import { authenticate } from '../middleware/mongodb-auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get recent transcript history
router.get('/recent', getRecentTranscripts);

// Search transcripts with filters
router.get('/search', searchTranscripts);

// Get transcript statistics
router.get('/stats', getTranscriptStats);

// Get specific transcript by ID
router.get('/:id', getTranscriptById);

// Update transcript
router.put('/:id', updateTranscript);

// Delete transcript
router.delete('/:id', deleteTranscript);

// Export transcripts
router.get('/export/:format', exportTranscripts);

export default router;


