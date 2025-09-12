"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcriptsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const transcripts_controller_1 = require("../controllers/transcripts.controller");
exports.transcriptsRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)();
// File upload for transcription
exports.transcriptsRouter.post('/stt/transcribe', upload.single('audio'), transcripts_controller_1.transcribeUpload);
// MVP transcripts CRUD (list/get/delete)
exports.transcriptsRouter.get('/transcripts', transcripts_controller_1.listTranscripts);
exports.transcriptsRouter.get('/transcripts/:id', transcripts_controller_1.getTranscript);
exports.transcriptsRouter.delete('/transcripts/:id', transcripts_controller_1.deleteTranscript);
