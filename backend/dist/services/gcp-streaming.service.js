"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcpStreamingTranscriptionService = void 0;
const path_1 = __importDefault(require("path"));
const speech_1 = require("@google-cloud/speech");
class GcpStreamingTranscriptionService {
    constructor(keyFilename) {
        this.sessions = new Map();
        const defaultPath = path_1.default.join(process.cwd(), 'hausa-text-f0bae78a7264.json');
        const credsPath = keyFilename || defaultPath;
        this.client = new speech_1.SpeechClient({ keyFilename: credsPath });
    }
    startSession(userId, mode, onUpdate) {
        const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const request = {
            config: {
                encoding: 'LINEAR16',
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
            .on('data', (data) => {
            const result = data.results?.[0];
            const alt = result?.alternatives?.[0];
            if (!alt?.transcript)
                return;
            const isFinal = Boolean(result?.isFinal);
            const s = this.sessions.get(sessionId);
            if (!s)
                return;
            if (isFinal) {
                s.accumulatedText = `${s.accumulatedText}${s.accumulatedText ? ' ' : ''}${alt.transcript}`;
            }
            if (s.onUpdate)
                s.onUpdate({ sessionId, text: alt.transcript, isFinal });
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
    processChunk(sessionId, audioChunk, _isFinal) {
        const s = this.sessions.get(sessionId);
        if (!s)
            throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
        // Write raw PCM 16-bit little-endian chunk directly
        s.stream.write(audioChunk);
    }
    endSession(sessionId) {
        const s = this.sessions.get(sessionId);
        if (!s)
            throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
        try {
            s.stream.end();
        }
        catch { }
        const finalText = s.accumulatedText;
        this.sessions.delete(sessionId);
        return { finalText };
    }
}
exports.GcpStreamingTranscriptionService = GcpStreamingTranscriptionService;
