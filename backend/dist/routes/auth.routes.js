"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const usage_service_1 = require("../services/usage.service");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
const authService = new auth_service_1.AuthService();
const usageService = new usage_service_1.UsageService();
/**
 * POST /api/auth/register
 * Register a new user (creates user in database after Firebase auth)
 */
router.post('/register', async (req, res) => {
    try {
        const { idToken, userData } = req.body;
        if (!idToken) {
            return res.status(400).json({
                error: 'Firebase ID token required',
                code: 'MISSING_ID_TOKEN'
            });
        }
        // Verify Firebase token and create/get user
        const user = await authService.verifyToken(idToken);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid or expired Firebase token',
                code: 'INVALID_TOKEN'
            });
        }
        // Update user data if provided
        if (userData) {
            const updatedUser = await authService.updateUserProfile(user.id, userData);
            if (updatedUser) {
                return res.json({
                    success: true,
                    user: updatedUser,
                    message: 'User registered successfully'
                });
            }
        }
        res.json({
            success: true,
            user,
            message: 'User registered successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error during user registration');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/auth/login
 * Login user (verify Firebase token and return user data)
 */
router.post('/login', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({
                error: 'Firebase ID token required',
                code: 'MISSING_ID_TOKEN'
            });
        }
        // Verify Firebase token
        const user = await authService.verifyToken(idToken);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid or expired Firebase token',
                code: 'INVALID_TOKEN'
            });
        }
        res.json({
            success: true,
            user,
            message: 'Login successful'
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error during user login');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/auth/refresh
 * Refresh user token and get updated user data
 */
router.post('/refresh', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({
                error: 'Firebase ID token required',
                code: 'MISSING_ID_TOKEN'
            });
        }
        // Verify Firebase token and get fresh user data
        const user = await authService.verifyToken(idToken);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid or expired Firebase token',
                code: 'INVALID_TOKEN'
            });
        }
        res.json({
            success: true,
            user,
            message: 'Token refreshed successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error during token refresh');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', auth_1.authenticate, async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error getting user profile');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', auth_1.authenticate, async (req, res) => {
    try {
        const { name, preferences } = req.body;
        const user = await authService.updateUserProfile(req.user.id, {
            name,
            preferences
        });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error updating user profile');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * GET /api/auth/usage
 * Get user usage statistics
 */
router.get('/usage', auth_1.authenticate, async (req, res) => {
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
            stats
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error getting usage stats');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * GET /api/auth/subscription/tiers
 * Get available subscription tiers
 */
router.get('/subscription/tiers', (req, res) => {
    try {
        const tiers = authService.getSubscriptionTiers();
        res.json({
            success: true,
            tiers
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error getting subscription tiers');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/auth/subscription/upgrade
 * Upgrade user subscription
 */
router.post('/subscription/upgrade', auth_1.authenticate, async (req, res) => {
    try {
        const { tier, paymentMethod } = req.body;
        if (!tier || !['basic', 'gold', 'premium'].includes(tier)) {
            return res.status(400).json({
                error: 'Invalid subscription tier',
                code: 'INVALID_TIER'
            });
        }
        const result = await authService.upgradeSubscription(req.user.id, tier, paymentMethod);
        if (!result.success) {
            return res.status(400).json({
                error: result.reason || 'Failed to upgrade subscription',
                code: 'UPGRADE_FAILED'
            });
        }
        res.json({
            success: true,
            user: result.user,
            message: `Successfully upgraded to ${tier} tier`
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error upgrading subscription');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/auth/subscription/cancel
 * Cancel user subscription
 */
router.post('/subscription/cancel', auth_1.authenticate, async (req, res) => {
    try {
        const result = await authService.cancelSubscription(req.user.id);
        if (!result.success) {
            return res.status(400).json({
                error: result.reason || 'Failed to cancel subscription',
                code: 'CANCEL_FAILED'
            });
        }
        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error cancelling subscription');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
exports.default = router;
