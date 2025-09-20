"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyResetService = exports.DailyResetService = void 0;
const User_1 = require("../models/User");
const logger_1 = require("../config/logger");
const AdminLog_1 = require("../models/AdminLog");
/**
 * Service for handling automatic daily limit resets
 */
class DailyResetService {
    constructor() {
        this.resetInterval = null;
        this.isRunning = false;
    }
    /**
     * Start the daily reset scheduler
     */
    start() {
        if (this.isRunning) {
            logger_1.logger.warn('Daily reset service is already running');
            return;
        }
        logger_1.logger.info('Starting daily reset service...');
        // Calculate time until next midnight
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setDate(nextMidnight.getDate() + 1);
        nextMidnight.setHours(0, 0, 0, 0);
        const msUntilMidnight = nextMidnight.getTime() - now.getTime();
        logger_1.logger.info({
            nextReset: nextMidnight.toISOString(),
            msUntilReset: msUntilMidnight
        }, 'Daily reset scheduled');
        // Set timeout for first reset
        setTimeout(() => {
            this.performDailyReset();
            this.scheduleNextReset();
        }, msUntilMidnight);
        this.isRunning = true;
    }
    /**
     * Stop the daily reset scheduler
     */
    stop() {
        if (this.resetInterval) {
            clearInterval(this.resetInterval);
            this.resetInterval = null;
        }
        this.isRunning = false;
        logger_1.logger.info('Daily reset service stopped');
    }
    /**
     * Schedule the next daily reset (every 24 hours)
     */
    scheduleNextReset() {
        // Reset every 24 hours (86400000 ms)
        this.resetInterval = setInterval(() => {
            this.performDailyReset();
        }, 24 * 60 * 60 * 1000);
    }
    /**
     * Perform the actual daily reset
     */
    async performDailyReset() {
        try {
            logger_1.logger.info('Starting daily reset process...');
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // Find users who need reset (last reset was before today)
            const usersToReset = await User_1.User.find({
                'usageStats.lastResetDate': { $lt: today }
            });
            logger_1.logger.info({
                usersToReset: usersToReset.length,
                resetDate: today.toISOString()
            }, 'Found users needing daily reset');
            if (usersToReset.length === 0) {
                logger_1.logger.info('No users need daily reset');
                return;
            }
            // Reset daily limits for all users
            const result = await User_1.User.updateMany({ 'usageStats.lastResetDate': { $lt: today } }, {
                $set: {
                    'usageStats.dailyMinutes': 0,
                    'usageStats.dailyFileUploads': 0,
                    'usageStats.dailyLiveRecordingMinutes': 0,
                    'usageStats.dailyRealTimeStreamingMinutes': 0,
                    'usageStats.dailyTranslationMinutes': 0,
                    'usageStats.dailyAIRequests': 0,
                    'usageStats.lastResetDate': today
                }
            });
            // Log the system reset action (with error handling)
            try {
                await AdminLog_1.AdminLog.create({
                    adminId: 'system',
                    adminEmail: 'system@hausa-stt.com',
                    action: 'system_reset',
                    resource: 'user_limits',
                    details: {
                        resetType: 'daily_limits_automatic',
                        usersAffected: result.modifiedCount,
                        resetDate: today.toISOString()
                    },
                    ipAddress: 'system',
                    userAgent: 'daily-reset-service'
                });
            }
            catch (logError) {
                logger_1.logger.warn({ logError }, 'Failed to log system reset action');
            }
            logger_1.logger.info({
                usersAffected: result.modifiedCount,
                resetDate: today.toISOString()
            }, 'Daily reset completed successfully');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Error during daily reset process');
        }
    }
    /**
     * Manually trigger a daily reset (for testing or admin use)
     */
    async triggerManualReset() {
        logger_1.logger.info('Manual daily reset triggered');
        await this.performDailyReset();
    }
    /**
     * Get the status of the daily reset service
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasInterval: this.resetInterval !== null
        };
    }
}
exports.DailyResetService = DailyResetService;
exports.dailyResetService = new DailyResetService();
