"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeUpload = transcribeUpload;
exports.listTranscripts = listTranscripts;
exports.getTranscript = getTranscript;
exports.deleteTranscript = deleteTranscript;
const gcp_stt_service_1 = require("../services/gcp-stt.service");
const transcripts_repository_1 = require("../repositories/transcripts.repository");
const mongodb_transcripts_repository_1 = require("../repositories/mongodb-transcripts.repository");
const audio_1 = require("../utils/audio");
const usage_service_1 = require("../services/usage.service");
const gcp = new gcp_stt_service_1.GcpSttService();
async function transcribeUpload(req, res) {
    const file = req.file;
    if (!file)
        return res.status(400).json({ message: 'No file uploaded' });
    const { sampleRateHertz, languageCode, encoding, source, targetLanguage } = req.body || {};
    const duration = file.buffer.length / (16000 * 2); // Estimate duration in seconds
    const durationMinutes = duration / 60; // Convert to minutes
    try {
        // Check limits for authenticated users based on source
        if (req.user) {
            const usageService = new usage_service_1.UsageService();
            if (source === 'live-recording') {
                // Check live recording limits
                const liveRecordingCheck = await usageService.checkLiveRecordingUsage(req.user.id, durationMinutes);
                if (!liveRecordingCheck.allowed) {
                    return res.status(403).json({
                        error: 'Live recording limit exceeded',
                        code: 'LIVE_RECORDING_LIMIT_EXCEEDED',
                        details: {
                            reason: liveRecordingCheck.reason,
                            remainingMinutes: liveRecordingCheck.remainingMinutes,
                            tier: liveRecordingCheck.tier,
                            resetTime: liveRecordingCheck.resetTime
                        }
                    });
                }
            }
            else {
                // Check file upload limits (default behavior)
                const fileUploadCheck = await usageService.checkFileUploadUsage(req.user.id, durationMinutes);
                if (!fileUploadCheck.allowed) {
                    return res.status(403).json({
                        error: 'File upload limit exceeded',
                        code: 'FILE_UPLOAD_LIMIT_EXCEEDED',
                        details: {
                            reason: fileUploadCheck.reason,
                            remainingUploads: fileUploadCheck.remainingUploads,
                            maxFileDuration: fileUploadCheck.maxFileDuration,
                            tier: fileUploadCheck.tier,
                            resetTime: fileUploadCheck.resetTime
                        }
                    });
                }
            }
        }
        // Normalize any container to 16kHz mono LINEAR16 WAV for consistent results
        console.log('Starting audio normalization...');
        console.log('Original file info:', {
            mimetype: file.mimetype,
            originalname: file.originalname,
            size: file.size
        });
        // Extract format from mimetype or filename
        let originalFormat = 'webm'; // default
        if (file.mimetype) {
            if (file.mimetype.includes('mp3'))
                originalFormat = 'mp3';
            else if (file.mimetype.includes('wav'))
                originalFormat = 'wav';
            else if (file.mimetype.includes('m4a'))
                originalFormat = 'm4a';
            else if (file.mimetype.includes('webm'))
                originalFormat = 'webm';
            else if (file.mimetype.includes('ogg'))
                originalFormat = 'ogg';
            else if (file.mimetype.includes('flac'))
                originalFormat = 'flac';
        }
        else if (file.originalname) {
            const ext = file.originalname.split('.').pop()?.toLowerCase();
            if (ext === 'mp3')
                originalFormat = 'mp3';
            else if (ext === 'wav')
                originalFormat = 'wav';
            else if (ext === 'm4a')
                originalFormat = 'm4a';
            else if (ext === 'webm')
                originalFormat = 'webm';
            else if (ext === 'ogg')
                originalFormat = 'ogg';
            else if (ext === 'flac')
                originalFormat = 'flac';
        }
        const normalized = await (0, audio_1.normalizeToLinear16Mono16k)(file.buffer, originalFormat);
        console.log('Audio normalized, size:', normalized.byteLength, 'bytes');
        const isLong = normalized.byteLength > 60 * 16000 * 2; // > ~60s at 16k, 16-bit mono
        let transcript = '';
        console.log('Starting transcription, isLong:', isLong);
        console.log('Audio buffer size:', normalized.byteLength, 'bytes');
        console.log('Language code:', languageCode || 'ha-NG');
        if (isLong) {
            // Check if GCS bucket is configured
            const bucket = process.env.GCS_BUCKET;
            if (!bucket) {
                return res.status(400).json({
                    success: false,
                    error: 'GCS_BUCKET environment variable not configured. Please set up Google Cloud Storage bucket for long audio files.',
                    code: 'GCS_BUCKET_NOT_CONFIGURED',
                    details: {
                        message: 'For audio files longer than 1 minute, a Google Cloud Storage bucket is required.',
                        solution: 'Set GCS_BUCKET environment variable to your Google Cloud Storage bucket name'
                    }
                });
            }
            const object = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
            console.log('Using long-running transcription with bucket:', bucket);
            const lr = await gcp.transcribeLongFile(normalized, bucket, object, { languageCode: languageCode || 'ha-NG' });
            transcript = lr.transcript;
            console.log('Long-running transcription result:', transcript);
        }
        else {
            console.log('Using short transcription with language:', languageCode || 'ha-NG');
            const result = await gcp.transcribeFile(normalized, {
                sampleRateHertz: 16000,
                languageCode: languageCode || 'ha-NG',
                encoding: 'LINEAR16',
            });
            transcript = result.transcript;
            console.log('Short transcription result:', transcript);
        }
        console.log('Final transcript before validation:', transcript);
        console.log('Transcript length:', transcript?.length || 0);
        console.log('Transcript type:', typeof transcript);
        const actualDuration = normalized.byteLength / (16000 * 2); // 16kHz, 16-bit mono
        const userId = req.user?.id ?? 'anonymous';
        const now = new Date().toISOString();
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        // Check if transcript is empty or invalid
        if (!transcript || transcript.trim() === '') {
            console.log('Empty transcript received, not saving to database');
            return res.status(400).json({
                success: false,
                message: 'No speech detected in the audio. Please try recording again.',
                error: 'EMPTY_TRANSCRIPT'
            });
        }
        // Perform translation if target language is different from source language
        let translation = '';
        if (targetLanguage && targetLanguage !== languageCode && transcript.trim()) {
            try {
                console.log(`Translating from ${languageCode} to ${targetLanguage}:`, transcript);
                // Import translation service
                const { translateText } = await Promise.resolve().then(() => __importStar(require('../services/translation.service')));
                // Map language codes for translation service
                const sourceLang = languageCode?.split('-')[0] || 'ha';
                const targetLang = targetLanguage?.split('-')[0] || 'en';
                const translationResult = await translateText(transcript, sourceLang, targetLang);
                translation = translationResult.translatedText;
                console.log('Translation result:', translation);
            }
            catch (error) {
                console.error('Translation failed:', error);
                // Continue without translation if it fails
            }
        }
        const t = {
            id,
            userId,
            title: file.originalname || (source === 'live-recording' ? 'Live Recording' : 'Uploaded audio'),
            content: transcript,
            timestamp: now,
            tags: [],
            isLocal: !req.user, // Local if no user authenticated
            cloudSync: !!req.user, // Cloud sync if user authenticated
            duration: actualDuration,
            language: languageCode || 'ha-NG',
            source: source === 'live-recording' ? 'live' : 'file_upload',
            isPremium: !!req.user,
        };
        // Save to both repositories for now (transition period)
        transcripts_repository_1.transcriptsRepo.create(t);
        await mongodb_transcripts_repository_1.mongoTranscriptsRepo.create(t);
        // Record usage for authenticated users based on source
        if (req.user) {
            const usageService = new usage_service_1.UsageService();
            if (source === 'live-recording') {
                // Record live recording usage
                await usageService.recordLiveRecordingUsage(req.user.id, actualDuration / 60 // Convert to minutes
                );
            }
            else {
                // Record file upload usage (default behavior)
                await usageService.recordFileUploadUsage(req.user.id, actualDuration / 60 // Convert to minutes
                );
            }
        }
        return res.json({
            transcript,
            translation: translation || undefined,
            id,
            duration: actualDuration,
            isPremium: !!req.user
        });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'Transcription failed' });
    }
}
function listTranscripts(req, res) {
    const userId = req.user?.id ?? 'stub-user-id';
    return res.json(transcripts_repository_1.transcriptsRepo.listByUser(userId));
}
function getTranscript(req, res) {
    const t = transcripts_repository_1.transcriptsRepo.get(req.params.id);
    if (!t)
        return res.status(404).json({ message: 'Not found' });
    return res.json(t);
}
function deleteTranscript(req, res) {
    const ok = transcripts_repository_1.transcriptsRepo.remove(req.params.id);
    return res.status(ok ? 204 : 404).send();
}
