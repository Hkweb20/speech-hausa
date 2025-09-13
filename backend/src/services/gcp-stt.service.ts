import path from 'path';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import { logger } from '../config/logger';
import { FileTranscriptionService } from './transcription.service';

export class GcpSttService implements FileTranscriptionService {
  private client: SpeechClient;
  private storage: Storage;

  constructor(keyFilename?: string) {
    const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const defaultPath = path.join(process.cwd(), 'hausa-text-f0bae78a7264.json');
    const credsPath = keyFilename || defaultPath;

    if (adcPath) {
      this.client = new SpeechClient({ keyFilename: adcPath });
      this.storage = new Storage({ keyFilename: adcPath });
      logger.info({ creds: 'ADC', path: adcPath }, 'Using GOOGLE_APPLICATION_CREDENTIALS');
    } else {
      this.client = new SpeechClient({ keyFilename: credsPath });
      this.storage = new Storage({ keyFilename: credsPath });
      logger.info({ creds: 'keyFilename', path: credsPath }, 'Using key file');
    }
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

    console.log('Sending request to Google Cloud Speech-to-Text...');
    console.log('Request config:', config);
    
    const [response] = await this.client.recognize(request);
    console.log('Google Cloud response:', JSON.stringify(response, null, 2));
    
    const alternative = response.results?.[0]?.alternatives?.[0];
    const confidence = alternative?.confidence ?? undefined;
    const transcript = alternative?.transcript ?? '';
    
    console.log('Extracted transcript:', transcript);
    console.log('Confidence:', confidence);
    
    return { transcript, confidence };
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


