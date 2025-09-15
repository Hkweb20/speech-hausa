"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const ai_simple_controller_1 = require("../controllers/ai-simple.controller");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const logger_1 = require("../config/logger");
exports.aiRouter = (0, express_1.Router)();
logger_1.logger.info('AI routes module loaded');
// AI text processing routes
exports.aiRouter.get('/test', ai_simple_controller_1.testAI);
exports.aiRouter.post('/summarize', mongodb_auth_1.optionalAuth, ai_simple_controller_1.summarizeText);
exports.aiRouter.post('/format', mongodb_auth_1.optionalAuth, ai_simple_controller_1.formatForPlatform);
exports.aiRouter.post('/format-all', mongodb_auth_1.optionalAuth, ai_simple_controller_1.formatForAllPlatforms);
exports.aiRouter.get('/usage', mongodb_auth_1.optionalAuth, ai_simple_controller_1.getAIUsage);
