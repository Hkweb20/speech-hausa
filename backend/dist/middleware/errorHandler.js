"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, _next) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof Error && err.code ? err.code : 'INTERNAL_ERROR';
    const requestId = req.requestId;
    const status = err.status || 500;
    res.status(status).json({ requestId, message, code });
}
