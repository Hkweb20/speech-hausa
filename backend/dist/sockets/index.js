"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSockets = initSockets;
const gcp_streaming_service_1 = require("../services/gcp-streaming.service");
const validators_1 = require("../utils/validators");
const logger_1 = require("../config/logger");
const transcripts_repository_1 = require("../repositories/transcripts.repository");
const NAMESPACE = '/transcription';
const MAX_CHUNK_BYTES = 512 * 1024; // 512KB per message cap
const MAX_RATE_MS = 0; // disabled when using ready/ack backpressure
function initSockets(io) {
    const ns = io.of(NAMESPACE);
    const service = new gcp_streaming_service_1.GcpStreamingTranscriptionService();
    const sessionPartials = new Map();
    const sessionStableFinal = new Map();
    const sessionLastEmitAt = new Map();
    const PARTIAL_MIN_INTERVAL_MS = 300;
    ns.use((socket, next) => {
        // Premium gating: header or query (?premium=true)
        const hdr = socket.handshake.headers['x-user-premium'] || '';
        const qry = socket.handshake.query?.premium || '';
        const isPremium = (hdr || qry).toString().toLowerCase() === 'true';
        // Attach to data for later checks
        socket.data.isPremium = isPremium;
        return next();
    });
    ns.on('connection', (socket) => {
        const rate = { lastAt: 0 };
        socket.data.ready = true; // ack-based flow
        socket.on('join_session', (payload) => {
            const parsed = validators_1.joinSessionSchema.safeParse(payload ?? {});
            if (!parsed.success) {
                return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid join_session payload' });
            }
            const { sessionId: providedId, mode } = parsed.data;
            if (mode === 'online' && !socket.data.isPremium) {
                return socket.emit('error', { code: 'PREMIUM_REQUIRED', message: 'Premium required for online mode' });
            }
            let sessionId = providedId;
            if (!sessionId) {
                const res = service.startSession('stub-user-id', mode, (u) => {
                    // Deduplicate partials to avoid spammy repeats
                    const last = sessionPartials.get(u.sessionId) || '';
                    if (u.isFinal) {
                        const stable = sessionStableFinal.get(u.sessionId) || '';
                        const newStable = `${stable}${stable ? ' ' : ''}${u.text}`.trim();
                        sessionStableFinal.set(u.sessionId, newStable);
                        sessionPartials.delete(u.sessionId);
                        sessionLastEmitAt.delete(u.sessionId);
                        ns.to(`session:${u.sessionId}`).emit('transcript_update', { sessionId: u.sessionId, text: u.text, fullText: newStable, isFinal: true });
                        return;
                    }
                    if (u.text && u.text !== last) {
                        // Throttle interim emissions
                        const now = Date.now();
                        const lastAt = sessionLastEmitAt.get(u.sessionId) || 0;
                        if (now - lastAt < PARTIAL_MIN_INTERVAL_MS)
                            return;
                        sessionLastEmitAt.set(u.sessionId, now);
                        sessionPartials.set(u.sessionId, u.text);
                        const stable = sessionStableFinal.get(u.sessionId) || '';
                        const fullText = `${stable}${stable ? ' ' : ''}${u.text}`.trim();
                        ns.to(`session:${u.sessionId}`).emit('transcript_update', { sessionId: u.sessionId, text: u.text, fullText, isFinal: false });
                    }
                });
                sessionId = res.sessionId;
            }
            socket.join(`session:${sessionId}`);
            socket.data.sessionId = sessionId;
            socket.emit('session_status', { sessionId, status: 'active' });
            socket.emit('ready');
        });
        socket.on('audio_chunk', (payload) => {
            // Backpressure: simple size + rate check
            // ack-based backpressure: only accept when ready flag is true
            if (!socket.data.ready) {
                return; // silently drop to avoid error spam
            }
            socket.data.ready = false;
            const parsed = validators_1.audioChunkSchema.safeParse(payload ?? {});
            if (!parsed.success) {
                return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid audio_chunk payload' });
            }
            let { sessionId, chunk, isFinal } = parsed.data;
            if (!sessionId) {
                sessionId = socket.data.sessionId;
            }
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'base64');
            if (buf.byteLength > MAX_CHUNK_BYTES) {
                return socket.emit('error', { code: 'PAYLOAD_TOO_LARGE', message: 'Chunk too large' });
            }
            try {
                service.processChunk(sessionId, buf, isFinal);
                // Immediately allow the next chunk; adjust if you want stricter pacing
                socket.data.ready = true;
                socket.emit('ready');
            }
            catch (e) {
                if (e?.code === 'SESSION_NOT_FOUND') {
                    // Session already ended; ignore further chunks
                    return;
                }
                logger_1.logger.error(e, 'processChunk failed');
                socket.emit('error', { code: e.code ?? 'PROCESSING_ERROR', message: e.message ?? 'Error' });
            }
        });
        socket.on('end_session', (payload) => {
            const parsed = validators_1.endSessionSchema.safeParse(payload ?? {});
            if (!parsed.success) {
                return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid end_session payload' });
            }
            let { sessionId } = parsed.data;
            if (!sessionId) {
                sessionId = socket.data.sessionId;
            }
            try {
                const { finalText } = service.endSession(sessionId);
                const stable = sessionStableFinal.get(sessionId) || '';
                const combined = (stable || finalText || '').trim();
                if (combined) {
                    ns.to(`session:${sessionId}`).emit('transcript_update', { sessionId, text: finalText, fullText: combined, isFinal: true });
                }
                ns.to(`session:${sessionId}`).emit('session_status', { sessionId, status: 'completed' });
                sessionPartials.delete(sessionId);
                sessionStableFinal.delete(sessionId);
                // Persist transcript
                const now = new Date().toISOString();
                const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
                const t = {
                    id,
                    userId: 'stub-user-id',
                    title: 'Live session',
                    content: finalText,
                    timestamp: now,
                    tags: [],
                    isLocal: true,
                    duration: 0,
                };
                transcripts_repository_1.transcriptsRepo.create(t);
            }
            catch (e) {
                logger_1.logger.error(e, 'endSession failed');
                socket.emit('error', { code: e.code ?? 'END_ERROR', message: e.message ?? 'Error' });
            }
        });
        socket.on('disconnect', () => {
            const sid = socket.data.sessionId;
            if (!sid)
                return;
            try {
                const { finalText } = service.endSession(sid);
                ns.to(`session:${sid}`).emit('transcript_update', { sessionId: sid, text: finalText, isFinal: true });
                ns.to(`session:${sid}`).emit('session_status', { sessionId: sid, status: 'completed' });
            }
            catch (_e) {
                // already ended or not found; ignore
            }
        });
    });
}
