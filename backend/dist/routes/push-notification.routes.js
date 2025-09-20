"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const push_notification_service_1 = require("../services/push-notification.service");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
// Register device token for push notifications
router.post('/register-token', mongodb_auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    const { token, platform } = req.body;
    if (!token || !platform) {
        return res.status(400).json({
            success: false,
            error: 'Token and platform are required'
        });
    }
    if (!['ios', 'android'].includes(platform)) {
        return res.status(400).json({
            success: false,
            error: 'Platform must be ios or android'
        });
    }
    push_notification_service_1.pushNotificationService.registerDeviceToken(userId, token, platform);
    res.json({
        success: true,
        message: 'Device token registered successfully'
    });
}));
// Unregister device token
router.delete('/unregister-token', mongodb_auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({
            success: false,
            error: 'Token is required'
        });
    }
    push_notification_service_1.pushNotificationService.unregisterDeviceToken(userId, token);
    res.json({
        success: true,
        message: 'Device token unregistered successfully'
    });
}));
// Get user's device tokens (for debugging)
router.get('/tokens', mongodb_auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    const tokens = push_notification_service_1.pushNotificationService.getUserTokens(userId);
    res.json({
        success: true,
        data: {
            tokens: tokens.map(token => ({
                platform: token.platform,
                lastActive: token.lastActive,
                // Don't expose the actual token for security
                token: token.token.substring(0, 8) + '...'
            }))
        }
    });
}));
// Send test notification (for testing purposes)
router.post('/test', mongodb_auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    const { title, body } = req.body;
    if (!title || !body) {
        return res.status(400).json({
            success: false,
            error: 'Title and body are required'
        });
    }
    await push_notification_service_1.pushNotificationService.sendToUser(userId, {
        title,
        body,
        data: {
            type: 'test',
            timestamp: new Date().toISOString()
        }
    });
    res.json({
        success: true,
        message: 'Test notification sent'
    });
}));
exports.default = router;
