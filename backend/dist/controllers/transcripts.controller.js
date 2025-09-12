"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeUpload = transcribeUpload;
exports.listTranscripts = listTranscripts;
exports.getTranscript = getTranscript;
exports.deleteTranscript = deleteTranscript;
const gcp_stt_service_1 = require("../services/gcp-stt.service");
const transcripts_repository_1 = require("../repositories/transcripts.repository");
const audio_1 = require("../utils/audio");
const gcp = new gcp_stt_service_1.GcpSttService();
async function transcribeUpload(req, res) {
    const file = req.file;
    if (!file)
        return res.status(400).json({ message: 'No file uploaded' });
    const { sampleRateHertz, languageCode, encoding } = req.body || {};
    try {
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
        const userId = req.user?.id ?? 'stub-user-id';
        const now = new Date().toISOString();
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const t = {
            id,
            userId,
            title: 'Uploaded audio',
            content: transcript,
            timestamp: now,
            tags: [],
            isLocal: true,
            duration: 0,
        };
        transcripts_repository_1.transcriptsRepo.create(t);
        return res.json({ transcript, id });
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
