import path from 'path';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import { FileTranscriptionService } from './transcription.service';

export class GcpSttService implements FileTranscriptionService {
  private client: SpeechClient;
  private storage: Storage;

  constructor(keyFilename?: string) {
    const defaultPath = path.join(process.cwd(), 'hausa-text-f0bae78a7264.json');
    const credsPath = keyFilename || defaultPath;
    this.client = new SpeechClient({ keyFilename: credsPath });
    this.storage = new Storage({ keyFilename: credsPath });
  }

  async transcribeFile(
    buffer: Buffer,
    options?: {
      sampleRateHertz?: number;
      languageCode?: string;
      encoding?: 'LINEAR16' | 'FLAC' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'WEBM_OPUS' | 'MP3';
    }
  ) {
    const encoding = options?.encoding;
    const config: Record<string, unknown> = {
      languageCode: options?.languageCode ?? 'ha-NG',
      enableAutomaticPunctuation: true,
    };
    if (encoding) config.encoding = encoding;
    // Only include sampleRateHertz if explicitly provided and not OPUS (GCP reads OPUS header)
    if (options?.sampleRateHertz && encoding !== 'WEBM_OPUS' && encoding !== 'OGG_OPUS') {
      config.sampleRateHertz = options.sampleRateHertz;
    }

    const request = {
      audio: { content: buffer.toString('base64') },
      config,
    } as const;

    const [response] = await this.client.recognize(request);
    const alternative = response.results?.[0]?.alternatives?.[0];
    const confidence = alternative?.confidence ?? undefined;
    return { transcript: alternative?.transcript ?? '', confidence };
  }

  async transcribeLongFile(
    buffer: Buffer,
    bucketName: string,
    objectName: string,
    options?: { languageCode?: string }
  ): Promise<{ transcript: string }> {
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(buffer, { contentType: 'audio/wav' });

    const request = {
      audio: { uri: `gs://${bucketName}/${objectName}` },
      config: {
        languageCode: options?.languageCode ?? 'ha-NG',
        enableAutomaticPunctuation: true,
        // encoding/sampleRateHertz can be omitted for storage URIs if container provides headers
      },
    } as const;

    const [operation] = await this.client.longRunningRecognize(request);
    const [result] = await operation.promise();
    const transcript = (result.results || [])
      .map((r) => r.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();
    // Optional: cleanup
    await file.delete({ ignoreNotFound: true });
    return { transcript };
  }
}


