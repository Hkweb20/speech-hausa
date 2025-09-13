"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeUpload = transcribeUpload;
exports.listTranscripts = listTranscripts;
exports.getTranscript = getTranscript;
exports.deleteTranscript = deleteTranscript;
const gcp_stt_service_1 = require("../services/gcp-stt.service");
const transcripts_repository_1 = require("../repositories/transcripts.repository");
const audio_1 = require("../utils/audio");
const usage_service_1 = require("../services/usage.service");
const gcp = new gcp_stt_service_1.GcpSttService();
async function transcribeUpload(req, res) {
    const file = req.file;
    if (!file)
        return res.status(400).json({ message: 'No file uploaded' });
    const { sampleRateHertz, languageCode, encoding } = req.body || {};
    const duration = file.buffer.length / (16000 * 2); // Estimate duration
    try {
        // Check usage limits for authenticated users
        if (req.user) {
            const usageService = new usage_service_1.UsageService();
            const usageCheck = await usageService.checkTranscriptionUsage(req.user.id, Math.ceil(duration / 60), // Convert to minutes
            'file_upload');
            if (!usageCheck.allowed) {
                return res.status(403).json({
                    error: 'Usage limit exceeded',
                    code: 'USAGE_LIMIT_EXCEEDED',
                    details: {
                        reason: usageCheck.reason,
                        remainingMinutes: usageCheck.remainingMinutes,
                        tier: usageCheck.tier
                    }
                });
            }
        }
        // Normalize any container to 16kHz mono LINEAR16 WAV for consistent results
        const normalized = await (0, audio_1.normalizeToLinear16Mono16k)(file.buffer);
        const isLong = normalized.byteLength > 60 * 16000 * 2; // > ~60s at 16k, 16-bit mono
        let transcript = '';
        if (isLong) {
            // Use long-running with GCS temp upload
            const bucket = process.env.GCS_BUCKET || 'hausa-stt-temp';
            const object = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
            const lr = await gcp.transcribeLongFile(normalized, bucket, object, { languageCode: languageCode || 'ha-NG' });
            transcript = lr.transcript;
        }
        else {
            const result = await gcp.transcribeFile(normalized, {
                sampleRateHertz: 16000,
                languageCode: languageCode || 'ha-NG',
                encoding: 'LINEAR16',
            });
            transcript = result.transcript;
        }
        const actualDuration = normalized.byteLength / (16000 * 2); // 16kHz, 16-bit mono
        const userId = req.user?.id ?? 'anonymous';
        const now = new Date().toISOString();
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const t = {
            id,
            userId,
            title: file.originalname || 'Uploaded audio',
            content: transcript,
            timestamp: now,
            tags: [],
            isLocal: !req.user, // Local if no user authenticated
            cloudSync: !!req.user, // Cloud sync if user authenticated
            duration: actualDuration,
        };
        transcripts_repository_1.transcriptsRepo.create(t);
        // Record usage for authenticated users
        if (req.user) {
            const usageService = new usage_service_1.UsageService();
            await usageService.recordUsage(req.user.id, Math.ceil(actualDuration / 60), 'file_upload');
        }
        return res.json({
            transcript,
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
