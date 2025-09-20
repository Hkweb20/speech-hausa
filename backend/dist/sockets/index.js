"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSockets = initSockets;
const gcp_streaming_service_1 = require("../services/gcp-streaming.service");
const validators_1 = require("../utils/validators");
const logger_1 = require("../config/logger");
const transcripts_repository_1 = require("../repositories/transcripts.repository");
const mongodb_transcripts_repository_1 = require("../repositories/mongodb-transcripts.repository");
const usage_service_1 = require("../services/usage.service");
const translation_service_1 = require("../services/translation.service");
const NAMESPACE = '/transcription';
const MAX_CHUNK_BYTES = 512 * 1024; // 512KB per message cap
const MAX_RATE_MS = 0; // disabled when using ready/ack backpressure
function initSockets(io) {
    const ns = io.of(NAMESPACE);
    const service = new gcp_streaming_service_1.GcpStreamingTranscriptionService();
    const usageService = new usage_service_1.UsageService();
    const sessionPartials = new Map();
    const sessionStableFinal = new Map();
    const sessionLastEmitAt = new Map();
    const sessionStartTimes = new Map();
    const sessionUsers = new Map();
    const sessionLanguages = new Map();
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
        socket.on('join_session', async (payload) => {
            const parsed = validators_1.joinSessionSchema.safeParse(payload ?? {});
            if (!parsed.success) {
                return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid join_session payload' });
            }
            const { sessionId: providedId, mode, userId, sourceLanguage, targetLanguage } = parsed.data;
            logger_1.logger.info({
                sessionId: providedId,
                mode,
                userId,
                sourceLanguage,
                targetLanguage,
                socketId: socket.id,
                handshakeQuery: socket.handshake.query
            }, 'WebSocket join_session received');
            if (mode === 'online' && !socket.data.isPremium) {
                return socket.emit('error', { code: 'PREMIUM_REQUIRED', message: 'Premium required for online mode' });
            }
            // Check real-time streaming limits for authenticated users
            if (userId && userId !== 'anonymous' && userId !== 'stub-user-id') {
                try {
                    const streamingCheck = await usageService.checkRealTimeStreamingUsage(userId, 0.1 // Request 6 seconds minimum (will be tracked with actual duration)
                    );
                    if (!streamingCheck.allowed) {
                        return socket.emit('error', {
                            code: 'REALTIME_STREAMING_LIMIT_EXCEEDED',
                            message: streamingCheck.reason,
                            details: {
                                remainingMinutes: streamingCheck.remainingMinutes,
                                tier: streamingCheck.tier,
                                resetTime: streamingCheck.resetTime
                            }
                        });
                    }
                }
                catch (error) {
                    logger_1.logger.error({ error, userId }, 'Error checking real-time streaming limits');
                    return socket.emit('error', {
                        code: 'USAGE_CHECK_ERROR',
                        message: 'Error checking usage limits'
                    });
                }
            }
            // Store language information for the session
            const defaultSourceLanguage = sourceLanguage || 'ha-NG';
            const defaultTargetLanguage = targetLanguage || 'en-US';
            let sessionId = providedId;
            if (!sessionId) {
                // Store language information BEFORE creating the session
                const tempSessionId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                sessionLanguages.set(tempSessionId, {
                    sourceLanguage: defaultSourceLanguage,
                    targetLanguage: defaultTargetLanguage
                });
                const res = service.startSession(userId || 'stub-user-id', mode, async (u) => {
                    // Deduplicate partials to avoid spammy repeats
                    const last = sessionPartials.get(u.sessionId) || '';
                    if (u.isFinal) {
                        const stable = sessionStableFinal.get(u.sessionId) || '';
                        const newStable = `${stable}${stable ? ' ' : ''}${u.text}`.trim();
                        sessionStableFinal.set(u.sessionId, newStable);
                        sessionPartials.delete(u.sessionId);
                        sessionLastEmitAt.delete(u.sessionId);
                        // Get language settings for this session
                        const languages = sessionLanguages.get(u.sessionId);
                        let translation = '';
                        logger_1.logger.info({
                            sessionId: u.sessionId,
                            languages,
                            text: u.text,
                            sessionLanguagesSize: sessionLanguages.size,
                            allSessionLanguages: Array.from(sessionLanguages.entries())
                        }, 'Translation check for final text');
                        // Perform translation if languages are different and text exists
                        if (languages && languages.sourceLanguage !== languages.targetLanguage && u.text.trim()) {
                            try {
                                const sourceLang = languages.sourceLanguage?.split('-')[0] || 'ha';
                                const targetLang = languages.targetLanguage?.split('-')[0] || 'en';
                                logger_1.logger.info({ sessionId: u.sessionId, sourceLang, targetLang, originalText: u.text }, 'Starting translation for final text');
                                const translationResult = await (0, translation_service_1.translateText)(u.text, sourceLang, targetLang);
                                translation = translationResult.translatedText;
                                logger_1.logger.info({ sessionId: u.sessionId, sourceLang, targetLang, originalText: u.text, translation }, 'Real-time translation completed');
                            }
                            catch (error) {
                                logger_1.logger.error({ error, sessionId: u.sessionId, text: u.text }, 'Real-time translation failed');
                            }
                        }
                        else {
                            logger_1.logger.info({
                                sessionId: u.sessionId,
                                hasLanguages: !!languages,
                                sourceLanguage: languages?.sourceLanguage,
                                targetLanguage: languages?.targetLanguage,
                                languagesMatch: languages?.sourceLanguage === languages?.targetLanguage,
                                hasText: !!u.text.trim()
                            }, 'Translation skipped for final text');
                        }
                        ns.to(`session:${u.sessionId}`).emit('transcript_update', {
                            sessionId: u.sessionId,
                            text: u.text,
                            fullText: newStable,
                            translation: translation,
                            isFinal: true
                        });
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
                        // Get language settings for this session
                        const languages = sessionLanguages.get(u.sessionId);
                        let translation = '';
                        logger_1.logger.info({
                            sessionId: u.sessionId,
                            languages,
                            text: u.text,
                            sessionLanguagesSize: sessionLanguages.size
                        }, 'Translation check for partial text');
                        // Perform translation for partial text if languages are different
                        if (languages && languages.sourceLanguage !== languages.targetLanguage && u.text.trim()) {
                            try {
                                const sourceLang = languages.sourceLanguage?.split('-')[0] || 'ha';
                                const targetLang = languages.targetLanguage?.split('-')[0] || 'en';
                                logger_1.logger.info({ sessionId: u.sessionId, sourceLang, targetLang, originalText: u.text }, 'Starting translation for partial text');
                                const translationResult = await (0, translation_service_1.translateText)(u.text, sourceLang, targetLang);
                                translation = translationResult.translatedText;
                                logger_1.logger.info({ sessionId: u.sessionId, sourceLang, targetLang, originalText: u.text, translation }, 'Real-time partial translation completed');
                            }
                            catch (error) {
                                logger_1.logger.error({ error, sessionId: u.sessionId, text: u.text }, 'Real-time partial translation failed');
                            }
                        }
                        else {
                            logger_1.logger.info({
                                sessionId: u.sessionId,
                                hasLanguages: !!languages,
                                sourceLanguage: languages?.sourceLanguage,
                                targetLanguage: languages?.targetLanguage,
                                languagesMatch: languages?.sourceLanguage === languages?.targetLanguage,
                                hasText: !!u.text.trim()
                            }, 'Translation skipped for partial text');
                        }
                        ns.to(`session:${u.sessionId}`).emit('transcript_update', {
                            sessionId: u.sessionId,
                            text: u.text,
                            fullText,
                            translation: translation,
                            isFinal: false
                        });
                    }
                });
                sessionId = res.sessionId;
                // Move language information to the actual session ID
                const languageInfo = sessionLanguages.get(tempSessionId);
                if (languageInfo) {
                    sessionLanguages.set(sessionId, languageInfo);
                    sessionLanguages.delete(tempSessionId);
                }
            }
            else {
                // Store language information for existing session
                sessionLanguages.set(sessionId, {
                    sourceLanguage: defaultSourceLanguage,
                    targetLanguage: defaultTargetLanguage
                });
            }
            // Track session start time and user for usage recording
            sessionStartTimes.set(sessionId, Date.now());
            // Try to get user ID from various sources
            let actualUserId = userId;
            if (!actualUserId || actualUserId === 'anonymous' || actualUserId === 'stub-user-id' || actualUserId === 'undefined') {
                // Try to get from socket handshake query parameters
                const queryUserId = socket.handshake.query?.userId;
                if (queryUserId && queryUserId !== 'undefined') {
                    actualUserId = queryUserId;
                }
            }
            if (actualUserId && actualUserId !== 'anonymous' && actualUserId !== 'stub-user-id' && actualUserId !== 'undefined') {
                sessionUsers.set(sessionId, actualUserId);
                logger_1.logger.info({ sessionId, userId: actualUserId, source: 'websocket' }, 'Real-time streaming session started with user tracking');
            }
            else {
                logger_1.logger.info({ sessionId, userId, actualUserId, reason: 'No valid user ID found' }, 'Real-time streaming session started without user tracking');
            }
            socket.join(`session:${sessionId}`);
            socket.data.sessionId = sessionId;
            socket.emit('session_status', { sessionId, status: 'active' });
            socket.emit('ready');
            // Set up periodic usage checking for authenticated users
            if (actualUserId && actualUserId !== 'anonymous' && actualUserId !== 'stub-user-id' && actualUserId !== 'undefined') {
                const usageCheckInterval = setInterval(async () => {
                    try {
                        const currentDuration = (Date.now() - sessionStartTimes.get(sessionId)) / (1000 * 60); // minutes
                        const remainingCheck = await usageService.checkRealTimeStreamingUsage(actualUserId, 0.1); // Check if any time remaining
                        if (!remainingCheck.allowed) {
                            logger_1.logger.warn({
                                sessionId,
                                userId: actualUserId,
                                currentDuration,
                                remainingMinutes: remainingCheck.remainingMinutes
                            }, 'Real-time streaming limit reached during session - ending session');
                            // End the session due to limit exceeded
                            clearInterval(usageCheckInterval);
                            socket.emit('session_status', { sessionId, status: 'limit_exceeded' });
                            socket.emit('error', {
                                code: 'REALTIME_STREAMING_LIMIT_EXCEEDED',
                                message: 'Daily real-time streaming limit reached. Session ended.',
                                details: {
                                    remainingMinutes: remainingCheck.remainingMinutes,
                                    tier: remainingCheck.tier,
                                    resetTime: remainingCheck.resetTime
                                }
                            });
                            // End the session
                            const { finalText } = service.endSession(sessionId);
                            ns.to(`session:${sessionId}`).emit('transcript_update', { sessionId, text: finalText, isFinal: true });
                            // Record usage for the time used
                            const durationMinutes = (Date.now() - sessionStartTimes.get(sessionId)) / (1000 * 60);
                            await usageService.recordRealTimeStreamingUsage(actualUserId, durationMinutes);
                            // Clean up
                            sessionStartTimes.delete(sessionId);
                            sessionUsers.delete(sessionId);
                            socket.disconnect();
                        }
                    }
                    catch (error) {
                        logger_1.logger.error({ error, sessionId, userId: actualUserId }, 'Error during periodic usage check');
                    }
                }, 10000); // Check every 10 seconds for better responsiveness
                // Store the interval ID so we can clear it later
                socket.data.usageCheckInterval = usageCheckInterval;
            }
        });
        // Handle language updates during active sessions
        socket.on('update_languages', (payload) => {
            const parsed = validators_1.updateLanguagesSchema.safeParse(payload ?? {});
            if (!parsed.success) {
                return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid update_languages payload' });
            }
            const { sourceLanguage, targetLanguage } = parsed.data;
            const sessionId = socket.data.sessionId;
            if (!sessionId) {
                return socket.emit('error', { code: 'NO_SESSION', message: 'No active session found' });
            }
            // Update language settings for the session
            sessionLanguages.set(sessionId, {
                sourceLanguage,
                targetLanguage
            });
            logger_1.logger.info({
                sessionId,
                sourceLanguage,
                targetLanguage,
                socketId: socket.id
            }, 'Language settings updated for session');
            socket.emit('languages_updated', {
                sessionId,
                sourceLanguage,
                targetLanguage
            });
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
        socket.on('end_session', async (payload) => {
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
                // Record real-time streaming usage for authenticated users
                const userId = sessionUsers.get(sessionId);
                const startTime = sessionStartTimes.get(sessionId);
                logger_1.logger.info({ sessionId, userId, startTime, sessionUsersSize: sessionUsers.size, sessionStartTimesSize: sessionStartTimes.size }, 'Checking session tracking for usage recording');
                if (userId && startTime) {
                    const durationMinutes = (Date.now() - startTime) / (1000 * 60); // Convert to minutes
                    try {
                        await usageService.recordRealTimeStreamingUsage(userId, durationMinutes);
                        logger_1.logger.info({ userId, sessionId, durationMinutes }, 'Real-time streaming usage recorded successfully');
                    }
                    catch (error) {
                        logger_1.logger.error({ error, userId, sessionId, durationMinutes }, 'Error recording real-time streaming usage');
                    }
                }
                else {
                    logger_1.logger.warn({ sessionId, userId, startTime }, 'No user tracking data found for session - usage not recorded');
                }
                // Clean up session tracking
                sessionStartTimes.delete(sessionId);
                sessionUsers.delete(sessionId);
                sessionLanguages.delete(sessionId);
                // Clear usage check interval if it exists
                const usageCheckInterval = socket.data.usageCheckInterval;
                if (usageCheckInterval) {
                    clearInterval(usageCheckInterval);
                    socket.data.usageCheckInterval = null;
                }
                // Persist transcript to both repositories (transition period)
                const now = new Date().toISOString();
                const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
                const t = {
                    id,
                    userId: userId || 'stub-user-id',
                    title: 'Real-time Streaming Session',
                    content: finalText,
                    timestamp: now,
                    tags: [],
                    isLocal: !userId, // Local if no user authenticated
                    cloudSync: !!userId, // Cloud sync if user authenticated
                    duration: startTime ? (Date.now() - startTime) / 1000 : 0, // Duration in seconds
                    language: sessionLanguages.get(sessionId) || 'ha-NG',
                    source: 'live',
                    isPremium: !!userId, // Premium if user authenticated
                };
                // Save to both repositories for now (transition period)
                transcripts_repository_1.transcriptsRepo.create(t);
                await mongodb_transcripts_repository_1.mongoTranscriptsRepo.create(t);
            }
            catch (e) {
                logger_1.logger.error(e, 'endSession failed');
                socket.emit('error', { code: e.code ?? 'END_ERROR', message: e.message ?? 'Error' });
            }
        });
        socket.on('disconnect', async () => {
            const sid = socket.data.sessionId;
            if (!sid)
                return;
            try {
                const { finalText } = service.endSession(sid);
                ns.to(`session:${sid}`).emit('transcript_update', { sessionId: sid, text: finalText, isFinal: true });
                ns.to(`session:${sid}`).emit('session_status', { sessionId: sid, status: 'completed' });
                // Record real-time streaming usage for authenticated users on disconnect
                const userId = sessionUsers.get(sid);
                const startTime = sessionStartTimes.get(sid);
                logger_1.logger.info({ sessionId: sid, userId, startTime, sessionUsersSize: sessionUsers.size, sessionStartTimesSize: sessionStartTimes.size }, 'Checking session tracking for usage recording on disconnect');
                if (userId && startTime) {
                    const durationMinutes = (Date.now() - startTime) / (1000 * 60); // Convert to minutes
                    try {
                        await usageService.recordRealTimeStreamingUsage(userId, durationMinutes);
                        logger_1.logger.info({ userId, sessionId: sid, durationMinutes }, 'Real-time streaming usage recorded on disconnect');
                    }
                    catch (error) {
                        logger_1.logger.error({ error, userId, sessionId: sid, durationMinutes }, 'Error recording real-time streaming usage on disconnect');
                    }
                }
                else {
                    logger_1.logger.warn({ sessionId: sid, userId, startTime }, 'No user tracking data found for session on disconnect - usage not recorded');
                }
                // Persist transcript to both repositories (transition period)
                if (finalText && finalText.trim()) {
                    const now = new Date().toISOString();
                    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
                    const t = {
                        id,
                        userId: userId || 'stub-user-id',
                        title: 'Real-time Streaming Session (Disconnected)',
                        content: finalText,
                        timestamp: now,
                        tags: [],
                        isLocal: !userId, // Local if no user authenticated
                        cloudSync: !!userId, // Cloud sync if user authenticated
                        duration: startTime ? (Date.now() - startTime) / 1000 : 0, // Duration in seconds
                        language: sessionLanguages.get(sid) || 'ha-NG',
                        source: 'live',
                        isPremium: !!userId, // Premium if user authenticated
                    };
                    // Save to both repositories for now (transition period)
                    transcripts_repository_1.transcriptsRepo.create(t);
                    await mongodb_transcripts_repository_1.mongoTranscriptsRepo.create(t);
                    logger_1.logger.info({ sessionId: sid, userId, transcriptId: id }, 'Real-time streaming transcript saved on disconnect');
                }
                // Clean up session tracking
                sessionStartTimes.delete(sid);
                sessionUsers.delete(sid);
                sessionLanguages.delete(sid);
                // Clear usage check interval if it exists
                const usageCheckInterval = socket.data.usageCheckInterval;
                if (usageCheckInterval) {
                    clearInterval(usageCheckInterval);
                    socket.data.usageCheckInterval = null;
                }
            }
            catch (_e) {
                // already ended or not found; ignore
            }
        });
    });
}
