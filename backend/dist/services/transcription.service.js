"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DummyTranscriptionService = void 0;
const HAUSA_TOKENS = [
    'Sannu',
    'da',
    'zuwa',
    'duniya',
    'Ina',
    'kwana',
    'Lafiya',
    'Kalma',
    'Hausa',
    'Magana',
    'Godiya',
    'Aiki',
    'Yau',
    'Gobe',
    'Kuma',
    'Na',
    'Kai',
    'Ni',
    'Muna',
    'Tafiya',
    'Gaskiya',
];
function generateHausaText(byteLength) {
    const tokensToGenerate = Math.max(1, Math.min(6, Math.floor(byteLength / 4000) + 1));
    const words = [];
    for (let i = 0; i < tokensToGenerate; i += 1) {
        const idx = Math.floor(Math.random() * HAUSA_TOKENS.length);
        words.push(HAUSA_TOKENS[idx]);
    }
    return words.join(' ');
}
class DummyTranscriptionService {
    constructor() {
        this.sessions = new Map();
    }
    startSession(userId, mode) {
        const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        this.sessions.set(sessionId, {
            userId,
            mode,
            startedAt: Date.now(),
            accumulatedText: '',
            totalBytes: 0,
        });
        return { sessionId };
    }
    processChunk(sessionId, audioChunk, isFinal) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
        session.totalBytes += audioChunk.byteLength;
        const partial = generateHausaText(audioChunk.byteLength);
        session.accumulatedText = `${session.accumulatedText}${session.accumulatedText ? ' ' : ''}${partial}`;
        return { text: partial, isFinal: Boolean(isFinal) };
    }
    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
        const finalText = session.accumulatedText;
        this.sessions.delete(sessionId);
        return { finalText };
    }
}
exports.DummyTranscriptionService = DummyTranscriptionService;
