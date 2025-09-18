"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLanguagesSchema = exports.endSessionSchema = exports.audioChunkSchema = exports.joinSessionSchema = void 0;
const zod_1 = require("zod");
exports.joinSessionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1).optional(),
    mode: zod_1.z.enum(['online', 'offline']).default('online'),
    userId: zod_1.z.string().optional(),
    sourceLanguage: zod_1.z.string().optional(),
    targetLanguage: zod_1.z.string().optional(),
});
exports.audioChunkSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
    chunk: zod_1.z.union([zod_1.z.string().min(1), zod_1.z.instanceof(Buffer)]),
    isFinal: zod_1.z.boolean().optional(),
});
exports.endSessionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
});
exports.updateLanguagesSchema = zod_1.z.object({
    sourceLanguage: zod_1.z.string().min(1),
    targetLanguage: zod_1.z.string().min(1),
});
