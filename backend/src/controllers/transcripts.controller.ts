import { Request, Response } from 'express';
import { GcpSttService } from '../services/gcp-stt.service';
import { transcriptsRepo } from '../repositories/transcripts.repository';
import { Transcript } from '../types/domain';
import { normalizeToLinear16Mono16k } from '../utils/audio';

const gcp = new GcpSttService();

export async function transcribeUpload(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  const { sampleRateHertz, languageCode, encoding } = req.body || {};
  try {
    // Normalize any container to 16kHz mono LINEAR16 WAV for consistent results
    const normalized = await normalizeToLinear16Mono16k(file.buffer);
    const isLong = normalized.byteLength > 60 * 16000 * 2; // > ~60s at 16k, 16-bit mono
    let transcript = '';
    if (isLong) {
      // Use long-running with GCS temp upload
      const bucket = process.env.GCS_BUCKET || 'hausa-stt-temp';
      const object = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
      const lr = await gcp.transcribeLongFile(normalized, bucket, object, { languageCode: languageCode || 'ha-NG' });
      transcript = lr.transcript;
    } else {
      const result = await gcp.transcribeFile(normalized, {
        sampleRateHertz: 16000,
        languageCode: languageCode || 'ha-NG',
        encoding: 'LINEAR16',
      });
      transcript = result.transcript;
    }
    const userId = req.user?.id ?? 'stub-user-id';
    const now = new Date().toISOString();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const t: Transcript = {
      id,
      userId,
      title: 'Uploaded audio',
      content: transcript,
      timestamp: now,
      tags: [],
      isLocal: true,
      duration: 0,
    } as Transcript;
    transcriptsRepo.create(t);
    return res.json({ transcript, id });
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

