"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
const sockets_1 = require("./sockets");
const daily_reset_service_1 = require("./services/daily-reset.service");
const seed_languages_1 = require("./scripts/seed-languages");
async function startServer() {
    try {
        // Connect to database
        await database_1.databaseService.connect();
        // Seed default languages
        await (0, seed_languages_1.seedLanguages)();
        const app = (0, app_1.createApp)();
        const server = http_1.default.createServer(app);
        const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
        (0, sockets_1.initSockets)(io);
        server.listen(env_1.env.PORT, () => {
            logger_1.logger.info({ port: env_1.env.PORT }, 'Server listening');
            // Start the daily reset service
            daily_reset_service_1.dailyResetService.start();
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            daily_reset_service_1.dailyResetService.stop();
            server.close(() => {
                logger_1.logger.info('Server closed');
                database_1.databaseService.disconnect().then(() => {
                    process.exit(0);
                });
            });
        });
        process.on('SIGINT', async () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            daily_reset_service_1.dailyResetService.stop();
            server.close(() => {
                logger_1.logger.info('Server closed');
                database_1.databaseService.disconnect().then(() => {
                    process.exit(0);
                });
            });
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}
startServer();
