"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcpSttService = void 0;
const path_1 = __importDefault(require("path"));
const speech_1 = require("@google-cloud/speech");
const storage_1 = require("@google-cloud/storage");
class GcpSttService {
    constructor(keyFilename) {
        const defaultPath = path_1.default.join(process.cwd(), 'hausa-text-f0bae78a7264.json');
        const credsPath = keyFilename || defaultPath;
        this.client = new speech_1.SpeechClient({ keyFilename: credsPath });
        this.storage = new storage_1.Storage({ keyFilename: credsPath });
    }
    async transcribeFile(buffer, options) {
        const encoding = options?.encoding;
        const config = {
            languageCode: options?.languageCode ?? 'ha-NG',
            enableAutomaticPunctuation: true,
        };
        if (encoding)
            config.encoding = encoding;
        // Only include sampleRateHertz if explicitly provided and not OPUS (GCP reads OPUS header)
        if (options?.sampleRateHertz && encoding !== 'WEBM_OPUS' && encoding !== 'OGG_OPUS') {
            config.sampleRateHertz = options.sampleRateHertz;
        }
        const request = {
            audio: { content: buffer.toString('base64') },
            config,
        };
        const [response] = await this.client.recognize(request);
        const alternative = response.results?.[0]?.alternatives?.[0];
        const confidence = alternative?.confidence ?? undefined;
        return { transcript: alternative?.transcript ?? '', confidence };
    }
    async transcribeLongFile(buffer, bucketName, objectName, options) {
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
        };
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
exports.GcpSttService = GcpSttService;
