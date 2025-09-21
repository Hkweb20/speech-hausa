import { Router } from 'express';
import multer from 'multer';
import { transcribeUpload, listTranscripts, getTranscript, deleteTranscript } from '../controllers/transcripts.controller';
import { optionalAuth } from '../middleware/mongodb-auth';

export const transcriptsRouter = Router();
const upload = multer();

// File upload for transcription with source-specific limits handled in controller
transcriptsRouter.post('/stt/transcribe', 
  optionalAuth as any,
  upload.single('audio'),
  transcribeUpload
);

// MVP transcripts CRUD (list/get/delete)
transcriptsRouter.get('/transcripts', optionalAuth as any, listTranscripts);
transcriptsRouter.get('/transcripts/:id', optionalAuth as any, getTranscript);
transcriptsRouter.delete('/transcripts/:id', optionalAuth as any, deleteTranscript);

