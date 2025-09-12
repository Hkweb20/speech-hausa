"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.string().default('4000'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    GOOGLE_PROJECT_ID: zod_1.z.string().optional(),
    FIREBASE_PROJECT_ID: zod_1.z.string().optional(),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string().optional(),
    FIREBASE_PRIVATE_KEY: zod_1.z.string().optional(),
    ENABLE_FIREBASE: zod_1.z.string().default('false'),
    STORAGE_PROVIDER: zod_1.z.enum(['memory', 'sqlite', 'firebase']).default('memory'),
    GCS_BUCKET: zod_1.z.string().optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = {
    ...parsed.data,
    PORT: Number(parsed.data.PORT),
    ENABLE_FIREBASE: parsed.data.ENABLE_FIREBASE === 'true',
};
