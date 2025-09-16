import type { Server, Socket } from 'socket.io';
import { GcpStreamingTranscriptionService } from '../services/gcp-streaming.service';
import { audioChunkSchema, endSessionSchema, joinSessionSchema } from '../utils/validators';
import { logger } from '../config/logger';
import { transcriptsRepo } from '../repositories/transcripts.repository';
import { Transcript } from '../types/domain';
import { UsageService } from '../services/usage.service';

const NAMESPACE = '/transcription';
const MAX_CHUNK_BYTES = 512 * 1024; // 512KB per message cap
const MAX_RATE_MS = 0; // disabled when using ready/ack backpressure

type RateState = { lastAt: number };

export function initSockets(io: Server) {
  const ns = io.of(NAMESPACE);
  const service = new GcpStreamingTranscriptionService();
  const usageService = new UsageService();
  const sessionPartials = new Map<string, string>();
  const sessionStableFinal = new Map<string, string>();
  const sessionLastEmitAt = new Map<string, number>();
  const sessionStartTimes = new Map<string, number>();
  const sessionUsers = new Map<string, string>();
  const PARTIAL_MIN_INTERVAL_MS = 300;

  ns.use((socket, next) => {
    // Premium gating: header or query (?premium=true)
    const hdr = (socket.handshake.headers['x-user-premium'] as string) || '';
    const qry = (socket.handshake.query?.premium as string) || '';
    const isPremium = (hdr || qry).toString().toLowerCase() === 'true';
    // Attach to data for later checks
    (socket.data as any).isPremium = isPremium;
    return next();
  });

  ns.on('connection', (socket: Socket) => {
    const rate: RateState = { lastAt: 0 };
    (socket.data as any).ready = true; // ack-based flow

    socket.on('join_session', async (payload) => {
      const parsed = joinSessionSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid join_session payload' });
      }
      const { sessionId: providedId, mode, userId } = parsed.data;
      
      logger.info({ 
        sessionId: providedId, 
        mode, 
        userId, 
        socketId: socket.id,
        handshakeQuery: socket.handshake.query 
      }, 'WebSocket join_session received');

      if (mode === 'online' && !(socket.data as any).isPremium) {
        return socket.emit('error', { code: 'PREMIUM_REQUIRED', message: 'Premium required for online mode' });
      }

      // Check real-time streaming limits for authenticated users
      if (userId && userId !== 'anonymous' && userId !== 'stub-user-id') {
        try {
          const streamingCheck = await usageService.checkRealTimeStreamingUsage(
            userId,
            0.1 // Request 6 seconds minimum (will be tracked with actual duration)
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
        } catch (error) {
          logger.error({ error, userId }, 'Error checking real-time streaming limits');
          return socket.emit('error', { 
            code: 'USAGE_CHECK_ERROR', 
            message: 'Error checking usage limits' 
          });
        }
      }

      let sessionId = providedId;
      if (!sessionId) {
        const res = service.startSession(userId || 'stub-user-id', mode, (u) => {
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
            if (now - lastAt < PARTIAL_MIN_INTERVAL_MS) return;
            sessionLastEmitAt.set(u.sessionId, now);
            sessionPartials.set(u.sessionId, u.text);
            const stable = sessionStableFinal.get(u.sessionId) || '';
            const fullText = `${stable}${stable ? ' ' : ''}${u.text}`.trim();
            ns.to(`session:${u.sessionId}`).emit('transcript_update', { sessionId: u.sessionId, text: u.text, fullText, isFinal: false });
          }
        });
        sessionId = res.sessionId;
      }

      // Track session start time and user for usage recording
      sessionStartTimes.set(sessionId, Date.now());
      
      // Try to get user ID from various sources
      let actualUserId = userId;
      if (!actualUserId || actualUserId === 'anonymous' || actualUserId === 'stub-user-id' || actualUserId === 'undefined') {
        // Try to get from socket handshake query parameters
        const queryUserId = socket.handshake.query?.userId as string;
        if (queryUserId && queryUserId !== 'undefined') {
          actualUserId = queryUserId;
        }
      }
      
      if (actualUserId && actualUserId !== 'anonymous' && actualUserId !== 'stub-user-id' && actualUserId !== 'undefined') {
        sessionUsers.set(sessionId, actualUserId);
        logger.info({ sessionId, userId: actualUserId, source: 'websocket' }, 'Real-time streaming session started with user tracking');
      } else {
        logger.info({ sessionId, userId, actualUserId, reason: 'No valid user ID found' }, 'Real-time streaming session started without user tracking');
      }

      socket.join(`session:${sessionId}`);
      (socket.data as any).sessionId = sessionId;
      socket.emit('session_status', { sessionId, status: 'active' });
      socket.emit('ready');

      // Set up periodic usage checking for authenticated users
      if (actualUserId && actualUserId !== 'anonymous' && actualUserId !== 'stub-user-id' && actualUserId !== 'undefined') {
        const usageCheckInterval = setInterval(async () => {
          try {
            const currentDuration = (Date.now() - sessionStartTimes.get(sessionId)!) / (1000 * 60); // minutes
            const remainingCheck = await usageService.checkRealTimeStreamingUsage(actualUserId, 0.1); // Check if any time remaining
            
            if (!remainingCheck.allowed) {
              logger.warn({ 
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
              const durationMinutes = (Date.now() - sessionStartTimes.get(sessionId)!) / (1000 * 60);
              await usageService.recordRealTimeStreamingUsage(actualUserId, durationMinutes);
              
              // Clean up
              sessionStartTimes.delete(sessionId);
              sessionUsers.delete(sessionId);
              socket.disconnect();
            }
          } catch (error) {
            logger.error({ error, sessionId, userId: actualUserId }, 'Error during periodic usage check');
          }
        }, 10000); // Check every 10 seconds for better responsiveness
        
        // Store the interval ID so we can clear it later
        (socket.data as any).usageCheckInterval = usageCheckInterval;
      }
    });

    socket.on('audio_chunk', (payload) => {
      // Backpressure: simple size + rate check
      // ack-based backpressure: only accept when ready flag is true
      if (!(socket.data as any).ready) {
        return; // silently drop to avoid error spam
      }
      (socket.data as any).ready = false;

      const parsed = audioChunkSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid audio_chunk payload' });
      }
      let { sessionId, chunk, isFinal } = parsed.data as any;
      if (!sessionId) {
        sessionId = (socket.data as any).sessionId;
      }

      const buf = Buffer.isBuffer(chunk) ? (chunk as Buffer) : Buffer.from(chunk, 'base64');
      if (buf.byteLength > MAX_CHUNK_BYTES) {
        return socket.emit('error', { code: 'PAYLOAD_TOO_LARGE', message: 'Chunk too large' });
      }

      try {
        service.processChunk(sessionId, buf, isFinal);
        // Immediately allow the next chunk; adjust if you want stricter pacing
        (socket.data as any).ready = true;
        socket.emit('ready');
      } catch (e: any) {
        if (e?.code === 'SESSION_NOT_FOUND') {
          // Session already ended; ignore further chunks
          return;
        }
        logger.error(e, 'processChunk failed');
        socket.emit('error', { code: e.code ?? 'PROCESSING_ERROR', message: e.message ?? 'Error' });
      }
    });

    socket.on('end_session', async (payload) => {
      const parsed = endSessionSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        return socket.emit('error', { code: 'BAD_REQUEST', message: 'Invalid end_session payload' });
      }
      let { sessionId } = parsed.data as any;
      if (!sessionId) {
        sessionId = (socket.data as any).sessionId;
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
        logger.info({ sessionId, userId, startTime, sessionUsersSize: sessionUsers.size, sessionStartTimesSize: sessionStartTimes.size }, 'Checking session tracking for usage recording');
        
        if (userId && startTime) {
          const durationMinutes = (Date.now() - startTime) / (1000 * 60); // Convert to minutes
          try {
            await usageService.recordRealTimeStreamingUsage(userId, durationMinutes);
            logger.info({ userId, sessionId, durationMinutes }, 'Real-time streaming usage recorded successfully');
          } catch (error) {
            logger.error({ error, userId, sessionId, durationMinutes }, 'Error recording real-time streaming usage');
          }
        } else {
          logger.warn({ sessionId, userId, startTime }, 'No user tracking data found for session - usage not recorded');
        }

        // Clean up session tracking
        sessionStartTimes.delete(sessionId);
        sessionUsers.delete(sessionId);
        
        // Clear usage check interval if it exists
        const usageCheckInterval = (socket.data as any).usageCheckInterval;
        if (usageCheckInterval) {
          clearInterval(usageCheckInterval);
          (socket.data as any).usageCheckInterval = null;
        }

        // Persist transcript
        const now = new Date().toISOString();
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const t: Transcript = {
          id,
          userId: userId || 'stub-user-id',
          title: 'Live session',
          content: finalText,
          timestamp: now,
          tags: [],
          isLocal: !userId, // Local if no user authenticated
          cloudSync: !!userId, // Cloud sync if user authenticated
          duration: startTime ? (Date.now() - startTime) / 1000 : 0, // Duration in seconds
        } as Transcript;
        transcriptsRepo.create(t);
      } catch (e: any) {
        logger.error(e, 'endSession failed');
        socket.emit('error', { code: e.code ?? 'END_ERROR', message: e.message ?? 'Error' });
      }
    });

    socket.on('disconnect', async () => {
      const sid = (socket.data as any).sessionId;
      if (!sid) return;
      try {
        const { finalText } = service.endSession(sid);
        ns.to(`session:${sid}`).emit('transcript_update', { sessionId: sid, text: finalText, isFinal: true });
        ns.to(`session:${sid}`).emit('session_status', { sessionId: sid, status: 'completed' });

        // Record real-time streaming usage for authenticated users on disconnect
        const userId = sessionUsers.get(sid);
        const startTime = sessionStartTimes.get(sid);
        logger.info({ sessionId: sid, userId, startTime, sessionUsersSize: sessionUsers.size, sessionStartTimesSize: sessionStartTimes.size }, 'Checking session tracking for usage recording on disconnect');
        
        if (userId && startTime) {
          const durationMinutes = (Date.now() - startTime) / (1000 * 60); // Convert to minutes
          try {
            await usageService.recordRealTimeStreamingUsage(userId, durationMinutes);
            logger.info({ userId, sessionId: sid, durationMinutes }, 'Real-time streaming usage recorded on disconnect');
          } catch (error) {
            logger.error({ error, userId, sessionId: sid, durationMinutes }, 'Error recording real-time streaming usage on disconnect');
          }
        } else {
          logger.warn({ sessionId: sid, userId, startTime }, 'No user tracking data found for session on disconnect - usage not recorded');
        }

        // Clean up session tracking
        sessionStartTimes.delete(sid);
        sessionUsers.delete(sid);
        
        // Clear usage check interval if it exists
        const usageCheckInterval = (socket.data as any).usageCheckInterval;
        if (usageCheckInterval) {
          clearInterval(usageCheckInterval);
          (socket.data as any).usageCheckInterval = null;
        }
      } catch (_e) {
        // already ended or not found; ignore
      }
    });
  });
}


