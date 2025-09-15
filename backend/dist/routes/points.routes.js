"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usage_service_1 = require("../services/usage.service");
const subscription_1 = require("../config/subscription");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const premium_guard_1 = require("../middleware/premium.guard");
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
const usageService = new usage_service_1.UsageService();
/**
 * GET /api/points/balance
 * Get user points balance
 */
router.get('/balance', mongodb_auth_1.authenticate, async (req, res) => {
    try {
        const stats = await usageService.getUserStats(req.user.id);
        if (!stats) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.json({
            success: true,
            points: stats.points,
            tier: stats.tier,
            limits: stats.limits
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error getting points balance');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * GET /api/points/actions
 * Get available points actions
 */
router.get('/actions', (req, res) => {
    try {
        const actions = Object.values(subscription_1.POINTS_ACTIONS);
        res.json({
            success: true,
            actions
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error getting points actions');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/points/watch-ad
 * Record ad watch and award points
 */
router.post('/watch-ad', mongodb_auth_1.authenticate, async (req, res) => {
    try {
        const { adId } = req.body;
        if (!adId) {
            return res.status(400).json({
                error: 'Ad ID required',
                code: 'MISSING_AD_ID'
            });
        }
        // TODO: Verify ad watch with AdMob or other ad network
        // For now, we'll trust the client but add server-side verification later
        const result = await usageService.addPointsFromAd(req.user.id, adId, 10 // 10 points per ad
        );
        if (!result.success) {
            return res.status(400).json({
                error: result.reason || 'Failed to add points',
                code: 'ADD_POINTS_FAILED'
            });
        }
        res.json({
            success: true,
            pointsEarned: 10,
            newBalance: result.newBalance,
            message: 'Points added successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error adding points from ad');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/points/summarize
 * Generate summary using points
 */
router.post('/summarize', mongodb_auth_1.authenticate, (0, premium_guard_1.requirePoints)('short_summary', 10), async (req, res) => {
    try {
        const { transcriptId, content, duration } = req.body;
        if (!content) {
            return res.status(400).json({
                error: 'Content required for summarization',
                code: 'MISSING_CONTENT'
            });
        }
        // Check duration limit (60 seconds for short summary)
        if (duration && duration > 60) {
            return res.status(400).json({
                error: 'Content too long for short summary. Maximum 60 seconds.',
                code: 'CONTENT_TOO_LONG'
            });
        }
        // TODO: Implement actual AI summarization
        // For now, return a mock summary
        const summary = `Summary: ${content.substring(0, 100)}...`;
        res.json({
            success: true,
            summary,
            pointsSpent: 10,
            remainingPoints: req.user.pointsBalance - 10
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error generating summary');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/points/punctuation
 * Fix punctuation using points
 */
router.post('/punctuation', mongodb_auth_1.authenticate, (0, premium_guard_1.requirePoints)('punctuation_fix', 5), async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({
                error: 'Content required for punctuation fix',
                code: 'MISSING_CONTENT'
            });
        }
        // Check length limit (500 characters for punctuation fix)
        if (content.length > 500) {
            return res.status(400).json({
                error: 'Content too long for punctuation fix. Maximum 500 characters.',
                code: 'CONTENT_TOO_LONG'
            });
        }
        // TODO: Implement actual AI punctuation fix
        // For now, return mock fixed content
        const fixedContent = content.replace(/([.!?])\s*([a-z])/g, '$1 $2');
        res.json({
            success: true,
            originalContent: content,
            fixedContent,
            pointsSpent: 5,
            remainingPoints: req.user.pointsBalance - 5
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error fixing punctuation');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/points/translate
 * Translate content using points
 */
router.post('/translate', mongodb_auth_1.authenticate, (0, premium_guard_1.requirePoints)('short_translation', 15), async (req, res) => {
    try {
        const { content, targetLanguage, duration } = req.body;
        if (!content || !targetLanguage) {
            return res.status(400).json({
                error: 'Content and target language required for translation',
                code: 'MISSING_PARAMETERS'
            });
        }
        // Check duration limit (60 seconds for short translation)
        if (duration && duration > 60) {
            return res.status(400).json({
                error: 'Content too long for short translation. Maximum 60 seconds.',
                code: 'CONTENT_TOO_LONG'
            });
        }
        // TODO: Implement actual AI translation
        // For now, return mock translation
        const translatedContent = `[${targetLanguage}] ${content}`;
        res.json({
            success: true,
            originalContent: content,
            translatedContent,
            targetLanguage,
            pointsSpent: 15,
            remainingPoints: req.user.pointsBalance - 15
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error translating content');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
exports.default = router;
