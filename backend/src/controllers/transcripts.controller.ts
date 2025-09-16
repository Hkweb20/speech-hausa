import { Request, Response } from 'express';
import { GcpSttService } from '../services/gcp-stt.service';
import { transcriptsRepo } from '../repositories/transcripts.repository';
import { Transcript } from '../types/domain';
import { normalizeToLinear16Mono16k } from '../utils/audio';
import { authenticate, AuthenticatedRequest } from '../middleware/mongodb-auth';
import { UsageService } from '../services/usage.service';

const gcp = new GcpSttService();

export async function transcribeUpload(req: AuthenticatedRequest, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  
  const { sampleRateHertz, languageCode, encoding, source } = req.body || {};
  const duration = file.buffer.length / (16000 * 2); // Estimate duration in seconds
  const durationMinutes = duration / 60; // Convert to minutes
  
  try {
    // Check limits for authenticated users based on source
    if (req.user) {
      const usageService = new UsageService();
      
      if (source === 'live-recording') {
        // Check live recording limits
        const liveRecordingCheck = await usageService.checkLiveRecordingUsage(
          req.user.id,
          durationMinutes
        );

        if (!liveRecordingCheck.allowed) {
          return res.status(403).json({
            error: 'Live recording limit exceeded',
            code: 'LIVE_RECORDING_LIMIT_EXCEEDED',
            details: {
              reason: liveRecordingCheck.reason,
              remainingMinutes: liveRecordingCheck.remainingMinutes,
              tier: liveRecordingCheck.tier,
              resetTime: liveRecordingCheck.resetTime
            }
          });
        }
      } else {
        // Check file upload limits (default behavior)
        const fileUploadCheck = await usageService.checkFileUploadUsage(
          req.user.id,
          durationMinutes
        );

        if (!fileUploadCheck.allowed) {
          return res.status(403).json({
            error: 'File upload limit exceeded',
            code: 'FILE_UPLOAD_LIMIT_EXCEEDED',
            details: {
              reason: fileUploadCheck.reason,
              remainingUploads: fileUploadCheck.remainingUploads,
              maxFileDuration: fileUploadCheck.maxFileDuration,
              tier: fileUploadCheck.tier,
              resetTime: fileUploadCheck.resetTime
            }
          });
        }
      }
    }

    // Normalize any container to 16kHz mono LINEAR16 WAV for consistent results
    console.log('Starting audio normalization...');
    const normalized = await normalizeToLinear16Mono16k(file.buffer);
    console.log('Audio normalized, size:', normalized.byteLength, 'bytes');
    
    const isLong = normalized.byteLength > 60 * 16000 * 2; // > ~60s at 16k, 16-bit mono
    let transcript = '';
    
    console.log('Starting transcription, isLong:', isLong);
    
    if (isLong) {
      // Use long-running with GCS temp upload
      const bucket = process.env.GCS_BUCKET || 'hausa-stt-temp';
      const object = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
      console.log('Using long-running transcription with bucket:', bucket);
      const lr = await gcp.transcribeLongFile(normalized, bucket, object, { languageCode: languageCode || 'ha-NG' });
      transcript = lr.transcript;
      console.log('Long-running transcription result:', transcript);
    } else {
      console.log('Using short transcription with language:', languageCode || 'ha-NG');
      const result = await gcp.transcribeFile(normalized, {
        sampleRateHertz: 16000,
        languageCode: languageCode || 'ha-NG',
        encoding: 'LINEAR16',
      });
      transcript = result.transcript;
      console.log('Short transcription result:', transcript);
    }
    
    const actualDuration = normalized.byteLength / (16000 * 2); // 16kHz, 16-bit mono
    const userId = req.user?.id ?? 'anonymous';
    const now = new Date().toISOString();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    
    const t: Transcript = {
      id,
      userId,
      title: file.originalname || 'Uploaded audio',
      content: transcript,
      timestamp: now,
      tags: [],
      isLocal: !req.user, // Local if no user authenticated
      cloudSync: !!req.user, // Cloud sync if user authenticated
      duration: actualDuration,
    } as Transcript;
    
    transcriptsRepo.create(t);
    
    // Record usage for authenticated users based on source
    if (req.user) {
      const usageService = new UsageService();
      
      if (source === 'live-recording') {
        // Record live recording usage
        await usageService.recordLiveRecordingUsage(
          req.user.id,
          actualDuration / 60 // Convert to minutes
        );
      } else {
        // Record file upload usage (default behavior)
        await usageService.recordFileUploadUsage(
          req.user.id,
          actualDuration / 60 // Convert to minutes
        );
      }
    }
    
    return res.json({ 
      transcript, 
      id, 
      duration: actualDuration,
      isPremium: !!req.user
    });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Transcription failed' });
  }
}

export function listTranscripts(req: Request, res: Response) {
  const userId = req.user?.id ?? 'stub-user-id';
  return res.json(transcriptsRepo.listByUser(userId));
}

export function getTranscript(req: Request, res: Response) {
  const t = transcriptsRepo.get(req.params.id);
  if (!t) return res.status(404).json({ message: 'Not found' });
  return res.json(t);
}

export function deleteTranscript(req: Request, res: Response) {
  const ok = transcriptsRepo.remove(req.params.id);
  return res.status(ok ? 204 : 404).send();
}

