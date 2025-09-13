import { Router } from 'express';
import multer from 'multer';
import { transcribeUpload, listTranscripts, getTranscript, deleteTranscript } from '../controllers/transcripts.controller';
import { optionalAuth } from '../middleware/mongodb-auth';
import { checkTranscriptionUsage, checkFileSizeLimit, recordUsage } from '../middleware/premium.guard';

export const transcriptsRouter = Router();
const upload = multer();

// File upload for transcription with premium gating
transcriptsRouter.post('/stt/transcribe', 
  optionalAuth,
  upload.single('audio'),
  checkFileSizeLimit(),
  checkTranscriptionUsage('file_upload'),
  transcribeUpload,
  recordUsage()
);

// MVP transcripts CRUD (list/get/delete)
transcriptsRouter.get('/transcripts', optionalAuth, listTranscripts);
transcriptsRouter.get('/transcripts/:id', optionalAuth, getTranscript);
transcriptsRouter.delete('/transcripts/:id', optionalAuth, deleteTranscript);

