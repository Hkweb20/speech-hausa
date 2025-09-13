"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcriptsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const transcripts_controller_1 = require("../controllers/transcripts.controller");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const premium_guard_1 = require("../middleware/premium.guard");
exports.transcriptsRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)();
// File upload for transcription with premium gating
exports.transcriptsRouter.post('/stt/transcribe', mongodb_auth_1.optionalAuth, upload.single('audio'), (0, premium_guard_1.checkFileSizeLimit)(), (0, premium_guard_1.checkTranscriptionUsage)('file_upload'), transcripts_controller_1.transcribeUpload, (0, premium_guard_1.recordUsage)());
// MVP transcripts CRUD (list/get/delete)
exports.transcriptsRouter.get('/transcripts', mongodb_auth_1.optionalAuth, transcripts_controller_1.listTranscripts);
exports.transcriptsRouter.get('/transcripts/:id', mongodb_auth_1.optionalAuth, transcripts_controller_1.getTranscript);
exports.transcriptsRouter.delete('/transcripts/:id', mongodb_auth_1.optionalAuth, transcripts_controller_1.deleteTranscript);
