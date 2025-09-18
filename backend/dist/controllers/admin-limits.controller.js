"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionTiers = getSubscriptionTiers;
exports.updateSubscriptionTier = updateSubscriptionTier;
exports.updateAllSubscriptionTiers = updateAllSubscriptionTiers;
exports.resetAllDailyLimits = resetAllDailyLimits;
const subscription_tiers_service_1 = require("../services/subscription-tiers.service");
const AdminLog_1 = require("../models/AdminLog");
const logger_1 = require("../config/logger");
async function getSubscriptionTiers(req, res) {
    try {
        const tiers = subscription_tiers_service_1.subscriptionTiersService.getTiers();
        res.json({
            success: true,
            tiers
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error getting subscription tiers');
        res.status(500).json({
            success: false,
            error: 'Failed to get subscription tiers'
        });
    }
}
async function updateSubscriptionTier(req, res) {
    try {
        const { tierName } = req.params;
        const updates = req.body;
        const currentTier = subscription_tiers_service_1.subscriptionTiersService.getTier(tierName);
        if (!currentTier) {
            return res.status(404).json({
                success: false,
                error: 'Subscription tier not found'
            });
        }
        // Update the tier using the centralized service
        const success = subscription_tiers_service_1.subscriptionTiersService.updateTier(tierName, updates);
        if (!success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update subscription tier'
            });
        }
        const updatedTier = subscription_tiers_service_1.subscriptionTiersService.getTier(tierName);
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'update_limits',
            resource: 'subscription_tiers',
            resourceId: tierName,
            details: {
                tierName,
                updates,
                oldTier: currentTier,
                newTier: updatedTier
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            tierName,
            updates
        }, 'Subscription tier updated');
        res.json({
            success: true,
            message: `Subscription tier '${tierName}' updated successfully`,
            tier: updatedTier
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error updating subscription tier');
        res.status(500).json({
            success: false,
            error: 'Failed to update subscription tier'
        });
    }
}
async function updateAllSubscriptionTiers(req, res) {
    try {
        const { tiers } = req.body;
        if (!tiers || typeof tiers !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid tiers data provided'
            });
        }
        // Validate each tier
        for (const [tierName, tierData] of Object.entries(tiers)) {
            if (!subscription_tiers_service_1.subscriptionTiersService.getTier(tierName)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid tier name: ${tierName}`
                });
            }
        }
        // Get old tiers for logging
        const oldTiers = subscription_tiers_service_1.subscriptionTiersService.getTiers();
        // Update all tiers using the centralized service
        const success = subscription_tiers_service_1.subscriptionTiersService.updateAllTiers(tiers);
        if (!success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update subscription tiers'
            });
        }
        const updatedTiers = subscription_tiers_service_1.subscriptionTiersService.getTiers();
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'update_limits',
            resource: 'subscription_tiers',
            details: {
                oldTiers,
                newTiers: tiers
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            tiersCount: Object.keys(tiers).length
        }, 'All subscription tiers updated');
        res.json({
            success: true,
            message: 'All subscription tiers updated successfully',
            tiers: updatedTiers
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error updating all subscription tiers');
        res.status(500).json({
            success: false,
            error: 'Failed to update subscription tiers'
        });
    }
}
async function resetAllDailyLimits(req, res) {
    try {
        const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
        // Reset daily limits for all users
        const result = await User.updateMany({}, {
            $set: {
                'usageStats.dailyMinutes': 0,
                'usageStats.dailyFileUploads': 0,
                'usageStats.dailyLiveRecordingMinutes': 0,
                'usageStats.dailyRealTimeStreamingMinutes': 0,
                'usageStats.dailyTranslationMinutes': 0,
                'usageStats.dailyAIRequests': 0,
                'usageStats.lastResetDate': new Date()
            }
        });
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'system_reset',
            resource: 'user_limits',
            details: {
                resetType: 'daily_limits',
                usersAffected: result.modifiedCount
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            usersAffected: result.modifiedCount
        }, 'All daily limits reset');
        res.json({
            success: true,
            message: `Daily limits reset for ${result.modifiedCount} users`
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error resetting daily limits');
        res.status(500).json({
            success: false,
            error: 'Failed to reset daily limits'
        });
    }
}
