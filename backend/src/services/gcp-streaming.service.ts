import path from 'path';
import { SpeechClient } from '@google-cloud/speech';
import { logger } from '../config/logger';
import type { TranscriptionMode, TranscriptionService, StartSessionResult } from './transcription.service';

type SessionState = {
  userId: string;
  mode: TranscriptionMode;
  stream: any; // Duplex stream from GCP client
  accumulatedText: string;
  onUpdate?: (u: { sessionId: string; text: string; isFinal?: boolean }) => void;
};

export class GcpStreamingTranscriptionService implements TranscriptionService {
  private client: SpeechClient;
  private sessions = new Map<string, SessionState>();

  constructor(keyFilename?: string) {
    const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const defaultPath = path.join(process.cwd(), 'hausa-text-f0bae78a7264.json');
    const credsPath = keyFilename || defaultPath;
    if (adcPath) {
      this.client = new SpeechClient({ keyFilename: adcPath });
      logger.info({ creds: 'ADC', path: adcPath }, 'Using GOOGLE_APPLICATION_CREDENTIALS');
    } else {
      this.client = new SpeechClient({ keyFilename: credsPath });
      logger.info({ creds: 'keyFilename', path: credsPath }, 'Using key file');
    }
  }

  startSession(
    userId: string,
    mode: TranscriptionMode,
    onUpdate?: (update: { sessionId: string; text: string; isFinal?: boolean }) => void,
  ): StartSessionResult {
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const request = {
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
        languageCode: 'ha-NG',
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    };

    const stream = this.client
      .streamingRecognize(request)
      .on('error', () => {
        // Allow socket layer to notify clients on demand; avoid crashing service
      })
      .on('data', (data: any) => {
        const result = data.results?.[0];
        const alt = result?.alternatives?.[0];
        if (!alt?.transcript) return;
        const isFinal = Boolean(result?.isFinal);
        const s = this.sessions.get(sessionId);
        if (!s) return;
        if (isFinal) {
          s.accumulatedText = `${s.accumulatedText}${s.accumulatedText ? ' ' : ''}${alt.transcript}`;
        }
        if (s.onUpdate) s.onUpdate({ sessionId, text: alt.transcript, isFinal });
      });

    this.sessions.set(sessionId, {
      userId,
      mode,
      stream,
      accumulatedText: '',
      onUpdate,
    });

    return { sessionId };
  }

  processChunk(sessionId: string, audioChunk: Buffer, _isFinal?: boolean): void {
    const s = this.sessions.get(sessionId);
    if (!s) throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
    // Write raw PCM 16-bit little-endian chunk directly
    s.stream.write(audioChunk);
  }

  endSession(sessionId: string): { finalText: string } {
    const s = this.sessions.get(sessionId);
    if (!s) throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
    try {
      s.stream.end();
    } catch {}
    const finalText = s.accumulatedText;
    this.sessions.delete(sessionId);
    return { finalText };
  }
}


