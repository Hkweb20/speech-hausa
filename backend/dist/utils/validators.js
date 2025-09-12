"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endSessionSchema = exports.audioChunkSchema = exports.joinSessionSchema = void 0;
const zod_1 = require("zod");
exports.joinSessionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1).optional(),
    mode: zod_1.z.enum(['online', 'offline']).default('online'),
});
exports.audioChunkSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
    chunk: zod_1.z.union([zod_1.z.string().min(1), zod_1.z.instanceof(Buffer)]),
    isFinal: zod_1.z.boolean().optional(),
});
exports.endSessionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
});
