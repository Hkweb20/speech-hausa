"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportedLanguages = exports.getAvailableVoices = exports.translateAndSpeak = exports.textToSpeech = exports.translateText = void 0;
const translation_service_1 = require("../services/translation.service");
const usage_service_1 = require("../services/usage.service");
const logger_1 = require("../config/logger");
const translationService = new translation_service_1.TranslationService();
const usageService = new usage_service_1.UsageService();
/**
 * Translate Hausa text to target language
 */
const translateText = async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;
        const userId = req.user?.id || 'anonymous';
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Text is required',
                code: 'MISSING_TEXT'
            });
        }
        if (!targetLanguage || !['en', 'fr', 'ar'].includes(targetLanguage)) {
            return res.status(400).json({
                success: false,
                error: 'Valid target language is required (en, fr, ar)',
                code: 'INVALID_LANGUAGE'
            });
        }
        if (text.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Text must be at least 3 characters long',
                code: 'TEXT_TOO_SHORT'
            });
        }
        // Check usage limits for authenticated users
        if (userId !== 'anonymous') {
            const usageCheck = await usageService.checkAIUsage(userId, 1);
            if (!usageCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'Translation usage limit exceeded',
                    code: 'TRANSLATION_USAGE_LIMIT_EXCEEDED',
                    details: {
                        reason: usageCheck.reason,
                        remainingRequests: usageCheck.remainingRequests,
                        tier: usageCheck.tier,
                        resetTime: usageCheck.resetTime
                    }
                });
            }
        }
        logger_1.logger.info({ userId, textLength: text.length, targetLanguage }, 'Starting text translation');
        const translatedText = await translationService.translateText(text, targetLanguage);
        // Record usage for authenticated users
        if (userId !== 'anonymous') {
            await usageService.recordAIUsage(userId, 1);
        }
        res.json({
            success: true,
            originalText: text,
            translatedText,
            targetLanguage,
            languageName: translationService.getLanguageName(targetLanguage),
            originalLength: text.length,
            translatedLength: translatedText.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error in translateText');
        res.status(500).json({
            success: false,
            error: 'Failed to translate text',
            code: 'TRANSLATION_FAILED'
        });
    }
};
exports.translateText = translateText;
/**
 * Convert text to speech
 */
const textToSpeech = async (req, res) => {
    try {
        const { text, languageCode, voiceName } = req.body;
        const userId = req.user?.id || 'anonymous';
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Text is required',
                code: 'MISSING_TEXT'
            });
        }
        if (!languageCode || !['en-US', 'fr-FR', 'ar-XA'].includes(languageCode)) {
            return res.status(400).json({
                success: false,
                error: 'Valid language code is required (en-US, fr-FR, ar-XA)',
                code: 'INVALID_LANGUAGE_CODE'
            });
        }
        if (text.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Text must be at least 3 characters long',
                code: 'TEXT_TOO_SHORT'
            });
        }
        // Check usage limits for authenticated users
        if (userId !== 'anonymous') {
            const usageCheck = await usageService.checkAIUsage(userId, 1);
            if (!usageCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'TTS usage limit exceeded',
                    code: 'TTS_USAGE_LIMIT_EXCEEDED',
                    details: {
                        reason: usageCheck.reason,
                        remainingRequests: usageCheck.remainingRequests,
                        tier: usageCheck.tier,
                        resetTime: usageCheck.resetTime
                    }
                });
            }
        }
        logger_1.logger.info({ userId, textLength: text.length, languageCode, voiceName }, 'Starting text-to-speech conversion');
        const audioBuffer = await translationService.textToSpeech(text, languageCode, voiceName);
        // Record usage for authenticated users
        if (userId !== 'anonymous') {
            await usageService.recordAIUsage(userId, 1);
        }
        // Set appropriate headers for audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
        res.send(audioBuffer);
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error in textToSpeech');
        res.status(500).json({
            success: false,
            error: 'Failed to convert text to speech',
            code: 'TTS_FAILED'
        });
    }
};
exports.textToSpeech = textToSpeech;
/**
 * Complete translation pipeline: translate and convert to speech
 */
const translateAndSpeak = async (req, res) => {
    const { text, targetLanguage, voiceName } = req.body;
    const userId = req.user?.id || 'anonymous';
    try {
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Text is required',
                code: 'MISSING_TEXT'
            });
        }
        if (!targetLanguage || !['en', 'fr', 'ar'].includes(targetLanguage)) {
            return res.status(400).json({
                success: false,
                error: 'Valid target language is required (en, fr, ar)',
                code: 'INVALID_LANGUAGE'
            });
        }
        if (text.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Text must be at least 3 characters long',
                code: 'TEXT_TOO_SHORT'
            });
        }
        // Check usage limits for authenticated users (counts as 2 requests: translate + TTS)
        if (userId !== 'anonymous') {
            const usageCheck = await usageService.checkAIUsage(userId, 2);
            if (!usageCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'Translation pipeline usage limit exceeded',
                    code: 'TRANSLATION_PIPELINE_USAGE_LIMIT_EXCEEDED',
                    details: {
                        reason: usageCheck.reason,
                        remainingRequests: usageCheck.remainingRequests,
                        tier: usageCheck.tier,
                        resetTime: usageCheck.resetTime
                    }
                });
            }
        }
        logger_1.logger.info({ userId, textLength: text.length, targetLanguage, voiceName }, 'Starting translation pipeline');
        const result = await translationService.translateAndSpeak(text, targetLanguage, voiceName);
        // Record usage for authenticated users (2 requests)
        if (userId !== 'anonymous') {
            await usageService.recordAIUsage(userId, 2);
        }
        // Set appropriate headers for audio response
        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            originalText: text,
            translatedText: result.translatedText,
            targetLanguage,
            languageName: translationService.getLanguageName(targetLanguage),
            languageCode: result.languageCode,
            voiceUsed: result.voiceUsed,
            audioSize: result.audioBuffer.length,
            audioData: result.audioBuffer.toString('base64'),
            originalLength: text.length,
            translatedLength: result.translatedText.length
        });
    }
    catch (error) {
        logger_1.logger.error({
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            text: text?.substring(0, 100),
            targetLanguage,
            voiceName,
            errorType: error.constructor.name
        }, 'Error in translateAndSpeak');
        res.status(500).json({
            success: false,
            error: 'Failed to complete translation pipeline',
            code: 'TRANSLATION_PIPELINE_FAILED'
        });
    }
};
exports.translateAndSpeak = translateAndSpeak;
/**
 * Get available voices for a language
 */
const getAvailableVoices = async (req, res) => {
    try {
        const { languageCode } = req.params;
        const userId = req.user?.id || 'anonymous';
        if (!languageCode || !['en-US', 'fr-FR', 'ar-XA'].includes(languageCode)) {
            return res.status(400).json({
                success: false,
                error: 'Valid language code is required (en-US, fr-FR, ar-XA)',
                code: 'INVALID_LANGUAGE_CODE'
            });
        }
        logger_1.logger.info({ userId, languageCode }, 'Getting available voices');
        const voices = await translationService.getAvailableVoices(languageCode);
        res.json({
            success: true,
            languageCode,
            voices,
            voiceCount: voices.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, languageCode: req.params.languageCode }, 'Error getting available voices');
        res.status(500).json({
            success: false,
            error: 'Failed to get available voices',
            code: 'VOICES_FETCH_FAILED'
        });
    }
};
exports.getAvailableVoices = getAvailableVoices;
/**
 * Get supported languages
 */
const getSupportedLanguages = async (req, res) => {
    try {
        const languages = [
            {
                code: 'en',
                name: 'English',
                ttsCode: 'en-US',
                flag: '🇺🇸'
            },
            {
                code: 'fr',
                name: 'French',
                ttsCode: 'fr-FR',
                flag: '🇫🇷'
            },
            {
                code: 'ar',
                name: 'Arabic',
                ttsCode: 'ar-XA',
                flag: '🇸🇦'
            }
        ];
        res.json({
            success: true,
            languages,
            totalLanguages: languages.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error getting supported languages');
        res.status(500).json({
            success: false,
            error: 'Failed to get supported languages',
            code: 'LANGUAGES_FETCH_FAILED'
        });
    }
};
exports.getSupportedLanguages = getSupportedLanguages;
