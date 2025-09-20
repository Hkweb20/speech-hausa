"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToLinear16Mono16k = normalizeToLinear16Mono16k;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
if (ffmpeg_static_1.default) {
    fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
}
async function normalizeToLinear16Mono16k(input) {
    console.log('Audio normalization input size:', input.length, 'bytes');
    const inPath = (0, path_1.join)((0, os_1.tmpdir)(), `in-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
    const outPath = (0, path_1.join)((0, os_1.tmpdir)(), `out-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
    (0, fs_1.writeFileSync)(inPath, input);
    console.log('Audio normalization input file written to:', inPath);
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inPath)
            .inputOptions(['-f', 'webm']) // Specify input format for webm files
            .audioChannels(1)
            .audioFrequency(16000)
            .toFormat('wav')
            .outputOptions(['-acodec pcm_s16le'])
            .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
        })
            .on('end', () => {
            try {
                const buf = (0, fs_1.readFileSync)(outPath);
                console.log('Audio normalization output size:', buf.length, 'bytes');
                (0, fs_1.unlinkSync)(inPath);
                (0, fs_1.unlinkSync)(outPath);
                resolve(buf);
            }
            catch (e) {
                console.error('Error reading normalized audio:', e);
                reject(e);
            }
        })
            .on('error', (err) => {
            console.error('FFmpeg error:', err);
            try {
                (0, fs_1.unlinkSync)(inPath);
            }
            catch { }
            try {
                (0, fs_1.unlinkSync)(outPath);
            }
            catch { }
            reject(err);
        })
            .save(outPath);
    });
}
