"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIUsage = exports.formatForAllPlatforms = exports.formatForPlatform = exports.summarizeText = exports.testAI = void 0;
const gemini_ai_service_1 = require("../services/gemini-ai.service");
const usage_service_1 = require("../services/usage.service");
const logger_1 = require("../config/logger");
const geminiService = new gemini_ai_service_1.GeminiAIService();
const usageService = new usage_service_1.UsageService();
/**
 * Test AI endpoint
 */
const testAI = async (req, res) => {
    res.json({ message: 'AI routes working!', timestamp: new Date().toISOString() });
};
exports.testAI = testAI;
/**
 * Summarize transcribed text using Gemini AI
 */
const summarizeText = async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user?.id || 'anonymous';
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Text is required',
                code: 'MISSING_TEXT'
            });
        }
        if (text.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Text must be at least 10 characters long',
                code: 'TEXT_TOO_SHORT'
            });
        }
        // Check AI usage limits for authenticated users
        if (userId !== 'anonymous') {
            const usageCheck = await usageService.checkAIUsage(userId, 1);
            if (!usageCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'AI usage limit exceeded',
                    code: 'AI_USAGE_LIMIT_EXCEEDED',
                    details: {
                        reason: usageCheck.reason,
                        remainingRequests: usageCheck.remainingRequests,
                        tier: usageCheck.tier,
                        resetTime: usageCheck.resetTime
                    }
                });
            }
        }
        logger_1.logger.info({ userId, textLength: text.length }, 'Starting text summarization');
        // Use real Gemini AI service
        const summary = await geminiService.summarizeText(text);
        // Record AI usage for authenticated users
        if (userId !== 'anonymous') {
            await usageService.recordAIUsage(userId, 1);
        }
        res.json({
            success: true,
            summary,
            originalText: text,
            summaryLength: summary.length,
            originalLength: text.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error in summarizeText');
        res.status(500).json({
            success: false,
            error: 'Failed to summarize text',
            code: 'SUMMARIZATION_FAILED'
        });
    }
};
exports.summarizeText = summarizeText;
/**
 * Format text for a specific social media platform
 */
const formatForPlatform = async (req, res) => {
    try {
        const { text, platform } = req.body;
        const userId = req.user?.id || 'anonymous';
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Text is required',
                code: 'MISSING_TEXT'
            });
        }
        if (!platform || !['facebook', 'whatsapp', 'x', 'instagram', 'telegram'].includes(platform)) {
            return res.status(400).json({
                success: false,
                error: 'Valid platform is required (facebook, whatsapp, x, instagram, telegram)',
                code: 'INVALID_PLATFORM'
            });
        }
        if (text.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Text must be at least 10 characters long',
                code: 'TEXT_TOO_SHORT'
            });
        }
        // Check AI usage limits for authenticated users
        if (userId !== 'anonymous') {
            const usageCheck = await usageService.checkAIUsage(userId, 1);
            if (!usageCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'AI usage limit exceeded',
                    code: 'AI_USAGE_LIMIT_EXCEEDED',
                    details: {
                        reason: usageCheck.reason,
                        remainingRequests: usageCheck.remainingRequests,
                        tier: usageCheck.tier,
                        resetTime: usageCheck.resetTime
                    }
                });
            }
        }
        logger_1.logger.info({ userId, platform, textLength: text.length }, 'Starting text formatting for platform');
        // Use real Gemini AI service
        const formattedText = await geminiService.formatForSocialMedia(text, platform);
        // Record AI usage for authenticated users
        if (userId !== 'anonymous') {
            await usageService.recordAIUsage(userId, 1);
        }
        res.json({
            success: true,
            formattedText,
            platform,
            originalText: text,
            formattedLength: formattedText.length,
            originalLength: text.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, platform: req.body.platform }, 'Error in formatForPlatform');
        res.status(500).json({
            success: false,
            error: 'Failed to format text for platform',
            code: 'FORMATTING_FAILED'
        });
    }
};
exports.formatForPlatform = formatForPlatform;
/**
 * Format text for all social media platforms
 */
const formatForAllPlatforms = async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user?.id || 'anonymous';
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Text is required',
                code: 'MISSING_TEXT'
            });
        }
        if (text.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Text must be at least 10 characters long',
                code: 'TEXT_TOO_SHORT'
            });
        }
        // Check AI usage limits for authenticated users (counts as 1 request)
        if (userId !== 'anonymous') {
            const usageCheck = await usageService.checkAIUsage(userId, 1);
            if (!usageCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'AI usage limit exceeded',
                    code: 'AI_USAGE_LIMIT_EXCEEDED',
                    details: {
                        reason: usageCheck.reason,
                        remainingRequests: usageCheck.remainingRequests,
                        tier: usageCheck.tier,
                        resetTime: usageCheck.resetTime
                    }
                });
            }
        }
        logger_1.logger.info({ userId, textLength: text.length }, 'Starting text formatting for all platforms');
        // Use real Gemini AI service
        const formattedTexts = await geminiService.formatForAllPlatforms(text);
        // Record AI usage for authenticated users
        if (userId !== 'anonymous') {
            await usageService.recordAIUsage(userId, 1);
        }
        res.json({
            success: true,
            formattedTexts,
            originalText: text,
            originalLength: text.length,
            platforms: Object.keys(formattedTexts)
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error in formatForAllPlatforms');
        res.status(500).json({
            success: false,
            error: 'Failed to format text for all platforms',
            code: 'FORMATTING_FAILED'
        });
    }
};
exports.formatForAllPlatforms = formatForAllPlatforms;
/**
 * Get AI usage limits for the current user
 */
const getAIUsage = async (req, res) => {
    try {
        const userId = req.user?.id || 'anonymous';
        if (userId === 'anonymous') {
            return res.json({
                success: true,
                usage: {
                    dailyRequests: 0,
                    monthlyRequests: 0,
                    totalRequests: 0,
                    remainingRequests: 5, // Free limit for anonymous users
                    tier: 'free',
                    resetTime: null
                }
            });
        }
        // Get real usage data for authenticated users
        const usage = await usageService.getAIUsage(userId);
        res.json({
            success: true,
            usage
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error getting AI usage');
        res.status(500).json({
            success: false,
            error: 'Failed to get AI usage',
            code: 'USAGE_FETCH_FAILED'
        });
    }
};
exports.getAIUsage = getAIUsage;
