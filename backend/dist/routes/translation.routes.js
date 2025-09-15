"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationRouter = void 0;
const express_1 = require("express");
const translation_controller_1 = require("../controllers/translation.controller");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const logger_1 = require("../config/logger");
exports.translationRouter = (0, express_1.Router)();
logger_1.logger.info('Translation routes module loaded');
// Translation routes
exports.translationRouter.post('/translate', mongodb_auth_1.optionalAuth, translation_controller_1.translateText);
exports.translationRouter.post('/tts', mongodb_auth_1.optionalAuth, translation_controller_1.textToSpeech);
exports.translationRouter.post('/translate-and-speak', mongodb_auth_1.optionalAuth, translation_controller_1.translateAndSpeak);
exports.translationRouter.get('/voices/:languageCode', mongodb_auth_1.optionalAuth, translation_controller_1.getAvailableVoices);
exports.translationRouter.get('/languages', mongodb_auth_1.optionalAuth, translation_controller_1.getSupportedLanguages);
logger_1.logger.info('Translation routes registered');
