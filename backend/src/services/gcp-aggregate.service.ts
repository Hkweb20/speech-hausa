import { GcpSttService } from './gcp-stt.service';
import type { TranscriptionMode, TranscriptionService, StartSessionResult } from './transcription.service';

type SessionState = {
  userId: string;
  mode: TranscriptionMode;
  buffers: Buffer[];
  timer?: NodeJS.Timeout | null;
  accumulatedText: string;
  onUpdate?: (u: { sessionId: string; text: string; isFinal?: boolean }) => void;
};

/**
 * Aggregates incoming audio chunks (e.g., WEBM_OPUS) and periodically calls non-streaming
 * GCP recognize() to produce partial transcripts, emitting via onUpdate.
 */
export class GcpAggregatingTranscriptionService implements TranscriptionService {
  private sessions = new Map<string, SessionState>();
  private gcp = new GcpSttService();
  private intervalMs = 1200; // batch window

  startSession(
    userId: string,
    mode: TranscriptionMode,
    onUpdate?: (update: { sessionId: string; text: string; isFinal?: boolean }) => void,
  ): StartSessionResult {
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.sessions.set(sessionId, {
      userId,
      mode,
      buffers: [],
      timer: null,
      accumulatedText: '',
      onUpdate,
    });
    return { sessionId };
  }

  processChunk(sessionId: string, audioChunk: Buffer, _isFinal?: boolean): void {
    const s = this.sessions.get(sessionId);
    if (!s) throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });

    s.buffers.push(audioChunk);

    if (!s.timer) {
      s.timer = setTimeout(async () => {
        s.timer = null;
        const buf = Buffer.concat(s.buffers);
        s.buffers = [];
        try {
          const { transcript } = await this.gcp.transcribeFile(buf, { encoding: 'WEBM_OPUS', languageCode: 'ha-NG' });
          if (transcript && s.onUpdate) {
            s.accumulatedText = `${s.accumulatedText}${s.accumulatedText ? ' ' : ''}${transcript}`;
            s.onUpdate({ sessionId, text: transcript, isFinal: false });
          }
        } catch (_e) {
          // swallow errors per batch; socket layer will report via error events if needed
        }
      }, this.intervalMs);
    }
  }

  endSession(sessionId: string): { finalText: string } {
    const s = this.sessions.get(sessionId);
    if (!s) throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
    if (s.timer) {
      clearTimeout(s.timer);
      s.timer = null;
    }
    const finalText = s.accumulatedText;
    // Emit final if any text
    if (finalText && s.onUpdate) {
      s.onUpdate({ sessionId, text: finalText, isFinal: true });
    }
    this.sessions.delete(sessionId);
    return { finalText };
  }
}


