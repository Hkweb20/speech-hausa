import { Router } from 'express';
import multer from 'multer';
import { transcribeUpload, listTranscripts, getTranscript, deleteTranscript } from '../controllers/transcripts.controller';

export const transcriptsRouter = Router();
const upload = multer();

// File upload for transcription
transcriptsRouter.post('/stt/transcribe', upload.single('audio'), transcribeUpload);

// MVP transcripts CRUD (list/get/delete)
transcriptsRouter.get('/transcripts', listTranscripts);
transcriptsRouter.get('/transcripts/:id', getTranscript);
transcriptsRouter.delete('/transcripts/:id', deleteTranscript);

