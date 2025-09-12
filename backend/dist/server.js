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
const sockets_1 = require("./sockets");
const app = (0, app_1.createApp)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
(0, sockets_1.initSockets)(io);
server.listen(env_1.env.PORT, () => {
    logger_1.logger.info({ port: env_1.env.PORT }, 'Server listening');
});
