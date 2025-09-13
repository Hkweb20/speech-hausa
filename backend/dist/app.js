"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const fs_1 = __importDefault(require("fs"));
const pino_http_1 = __importDefault(require("pino-http"));
const routes_1 = require("./routes");
const requestId_1 = require("./middleware/requestId");
const notFound_1 = require("./middleware/notFound");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./config/logger");
const path = require('path');
const openApiPathDist = path.join(__dirname, 'docs', 'openapi.yaml');
const openApiPathSrc = path.join(process.cwd(), 'src', 'docs', 'openapi.yaml');
const openApiDocument = yamljs_1.default.load(require('fs').existsSync(openApiPathDist) ? openApiPathDist : openApiPathSrc);
function createApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use(requestId_1.requestId);
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'", "'unsafe-inline'", "'unsafe-hashes'", 'https://cdn.socket.io', 'blob:'],
                "script-src-elem": ["'self'", "'unsafe-inline'", "'unsafe-hashes'", 'https://cdn.socket.io', 'blob:'],
                "script-src-attr": ["'unsafe-inline'", "'unsafe-hashes'"],
                "connect-src": ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
                "media-src": ["'self'", 'blob:', 'data:'],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", 'data:'],
                "worker-src": ["'self'", 'blob:'],
                "object-src": ["'none'"],
            },
        },
    }));
    app.use((0, cors_1.default)());
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '2mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Serve static test page if present
    const staticDirCandidate1 = path.resolve(__dirname, '..', 'public');
    const staticDirCandidate2 = path.resolve(process.cwd(), 'public');
    const staticDir = fs_1.default.existsSync(staticDirCandidate1)
        ? staticDirCandidate1
        : fs_1.default.existsSync(staticDirCandidate2)
            ? staticDirCandidate2
            : undefined;
    if (staticDir) {
        app.use(express_1.default.static(staticDir));
    }
    app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openApiDocument));
    app.use('/', routes_1.apiRouter);
    app.use(notFound_1.notFound);
    app.use(errorHandler_1.errorHandler);
    return app;
}
