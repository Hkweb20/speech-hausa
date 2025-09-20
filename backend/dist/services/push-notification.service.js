"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushNotificationService = exports.PushNotificationService = void 0;
const logger_1 = require("../config/logger");
class PushNotificationService {
    constructor() {
        this.deviceTokens = new Map();
    }
    // Register device token for push notifications
    registerDeviceToken(userId, token, platform) {
        if (!this.deviceTokens.has(userId)) {
            this.deviceTokens.set(userId, []);
        }
        const tokens = this.deviceTokens.get(userId);
        const existingToken = tokens.find(t => t.token === token);
        if (existingToken) {
            existingToken.lastActive = new Date();
        }
        else {
            tokens.push({
                userId,
                token,
                platform,
                lastActive: new Date()
            });
        }
        logger_1.logger.info({ userId, platform, tokenCount: tokens.length }, 'Device token registered');
    }
    // Unregister device token
    unregisterDeviceToken(userId, token) {
        const tokens = this.deviceTokens.get(userId);
        if (tokens) {
            const index = tokens.findIndex(t => t.token === token);
            if (index > -1) {
                tokens.splice(index, 1);
                logger_1.logger.info({ userId, tokenCount: tokens.length }, 'Device token unregistered');
            }
        }
    }
    // Send push notification to user
    async sendToUser(userId, payload) {
        const tokens = this.deviceTokens.get(userId);
        if (!tokens || tokens.length === 0) {
            logger_1.logger.warn({ userId }, 'No device tokens found for user');
            return;
        }
        const promises = tokens.map(token => this.sendToDevice(token, payload));
        await Promise.allSettled(promises);
    }
    // Send push notification to specific device
    async sendToDevice(deviceToken, payload) {
        try {
            // This is a placeholder implementation
            // In production, you would integrate with:
            // - Firebase Cloud Messaging (FCM) for Android
            // - Apple Push Notification Service (APNs) for iOS
            logger_1.logger.info({
                userId: deviceToken.userId,
                platform: deviceToken.platform,
                title: payload.title
            }, 'Sending push notification');
            // Simulate sending notification
            await new Promise(resolve => setTimeout(resolve, 100));
            logger_1.logger.info({ userId: deviceToken.userId }, 'Push notification sent successfully');
        }
        catch (error) {
            logger_1.logger.error({ error, userId: deviceToken.userId }, 'Failed to send push notification');
        }
    }
    // Send notification to all users (broadcast)
    async broadcast(payload) {
        const allUserIds = Array.from(this.deviceTokens.keys());
        const promises = allUserIds.map(userId => this.sendToUser(userId, payload));
        await Promise.allSettled(promises);
    }
    // Get user's device tokens
    getUserTokens(userId) {
        return this.deviceTokens.get(userId) || [];
    }
    // Clean up inactive tokens (older than 30 days)
    cleanupInactiveTokens() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        for (const [userId, tokens] of this.deviceTokens.entries()) {
            const activeTokens = tokens.filter(token => token.lastActive > thirtyDaysAgo);
            this.deviceTokens.set(userId, activeTokens);
            if (activeTokens.length !== tokens.length) {
                logger_1.logger.info({
                    userId,
                    removed: tokens.length - activeTokens.length,
                    remaining: activeTokens.length
                }, 'Cleaned up inactive device tokens');
            }
        }
    }
}
exports.PushNotificationService = PushNotificationService;
exports.pushNotificationService = new PushNotificationService();
