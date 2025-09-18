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
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.getUserUsage = getUserUsage;
exports.updateUser = updateUser;
exports.resetUserDailyLimits = resetUserDailyLimits;
exports.resetUserMonthlyLimits = resetUserMonthlyLimits;
exports.upgradeUser = upgradeUser;
exports.bulkUpgradeUsers = bulkUpgradeUsers;
exports.getUserSubscriptionInfo = getUserSubscriptionInfo;
exports.deleteUser = deleteUser;
const User_1 = require("../models/User");
const AdminLog_1 = require("../models/AdminLog");
const logger_1 = require("../config/logger");
async function getAllUsers(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const tier = req.query.tier;
        const skip = (page - 1) * limit;
        // Build query
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (tier) {
            query.subscriptionTier = tier;
        }
        const users = await User_1.User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await User_1.User.countDocuments(query);
        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error getting all users');
        res.status(500).json({
            success: false,
            error: 'Failed to get users'
        });
    }
}
async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error getting user by ID');
        res.status(500).json({
            success: false,
            error: 'Failed to get user'
        });
    }
}
async function getUserUsage(req, res) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                subscriptionTier: user.subscriptionTier,
                usageStats: user.usageStats,
                pointsBalance: user.pointsBalance,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error getting user usage');
        res.status(500).json({
            success: false,
            error: 'Failed to get user usage'
        });
    }
}
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Remove sensitive fields that shouldn't be updated via admin
        delete updates.password;
        delete updates._id;
        delete updates.createdAt;
        const user = await User_1.User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'update_user',
            resource: 'user',
            resourceId: id,
            details: {
                userId: id,
                updates,
                oldUser: await User_1.User.findById(id).select('-password')
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            userId: id,
            updates
        }, 'User updated by admin');
        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error updating user');
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
}
async function resetUserDailyLimits(req, res) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Reset daily limits
        user.usageStats.dailyMinutes = 0;
        user.usageStats.dailyFileUploads = 0;
        user.usageStats.dailyLiveRecordingMinutes = 0;
        user.usageStats.dailyRealTimeStreamingMinutes = 0;
        user.usageStats.dailyTranslationMinutes = 0;
        user.usageStats.dailyAIRequests = 0;
        user.usageStats.lastResetDate = new Date();
        await user.save();
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'reset_user_limits',
            resource: 'user_limits',
            resourceId: id,
            details: {
                userId: id,
                resetType: 'daily_limits'
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            userId: id
        }, 'User daily limits reset by admin');
        res.json({
            success: true,
            message: 'User daily limits reset successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error resetting user daily limits');
        res.status(500).json({
            success: false,
            error: 'Failed to reset user daily limits'
        });
    }
}
async function resetUserMonthlyLimits(req, res) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Reset monthly limits
        user.usageStats.monthlyMinutes = 0;
        user.usageStats.monthlyFileUploads = 0;
        user.usageStats.monthlyLiveRecordingMinutes = 0;
        user.usageStats.monthlyRealTimeStreamingMinutes = 0;
        user.usageStats.monthlyTranslationMinutes = 0;
        user.usageStats.monthlyAIRequests = 0;
        await user.save();
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'reset_user_limits',
            resource: 'user_limits',
            resourceId: id,
            details: {
                userId: id,
                resetType: 'monthly_limits'
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            userId: id
        }, 'User monthly limits reset by admin');
        res.json({
            success: true,
            message: 'User monthly limits reset successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error resetting user monthly limits');
        res.status(500).json({
            success: false,
            error: 'Failed to reset user monthly limits'
        });
    }
}
async function upgradeUser(req, res) {
    try {
        const { id } = req.params;
        const { subscriptionTier, subscriptionStatus, subscriptionExpiresAt, customLimits } = req.body;
        const user = await User_1.User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const oldTier = user.subscriptionTier;
        const oldStatus = user.subscriptionStatus;
        // Update subscription details
        const updateData = {
            subscriptionTier,
            subscriptionStatus: subscriptionStatus || 'active',
            updatedAt: new Date()
        };
        // Set expiration date if provided
        if (subscriptionExpiresAt) {
            updateData.subscriptionExpiresAt = new Date(subscriptionExpiresAt);
        }
        // Apply custom limits if provided
        if (customLimits) {
            // Custom limits override the tier defaults
            updateData.customLimits = {
                dailyMinutes: customLimits.dailyMinutes,
                monthlyMinutes: customLimits.monthlyMinutes,
                dailyFileUploads: customLimits.dailyFileUploads,
                maxFileDuration: customLimits.maxFileDuration,
                dailyLiveRecordingMinutes: customLimits.dailyLiveRecordingMinutes,
                dailyRealTimeStreamingMinutes: customLimits.dailyRealTimeStreamingMinutes,
                dailyTranslationMinutes: customLimits.dailyTranslationMinutes,
                dailyAIRequests: customLimits.dailyAIRequests,
                monthlyAIRequests: customLimits.monthlyAIRequests,
                aiFeatures: customLimits.aiFeatures,
                exportFormats: customLimits.exportFormats,
                cloudSync: customLimits.cloudSync,
                offlineMode: customLimits.offlineMode,
                prioritySupport: customLimits.prioritySupport,
                apiAccess: customLimits.apiAccess
            };
        }
        const updatedUser = await User_1.User.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).select('-password');
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'update_user',
            resource: 'user',
            resourceId: id,
            details: {
                userId: id,
                action: 'subscription_upgrade',
                oldTier,
                newTier: subscriptionTier,
                oldStatus,
                newStatus: subscriptionStatus,
                customLimits: customLimits || null,
                subscriptionExpiresAt: subscriptionExpiresAt || null
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            userId: id,
            oldTier,
            newTier: subscriptionTier,
            customLimits: !!customLimits
        }, 'User subscription upgraded by admin');
        res.json({
            success: true,
            message: `User upgraded to ${subscriptionTier} tier successfully`,
            user: updatedUser
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error upgrading user');
        res.status(500).json({
            success: false,
            error: 'Failed to upgrade user'
        });
    }
}
async function bulkUpgradeUsers(req, res) {
    try {
        const { userIds, subscriptionTier, subscriptionStatus, subscriptionExpiresAt, customLimits } = req.body;
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'User IDs array is required'
            });
        }
        const updateData = {
            subscriptionTier,
            subscriptionStatus: subscriptionStatus || 'active',
            updatedAt: new Date()
        };
        if (subscriptionExpiresAt) {
            updateData.subscriptionExpiresAt = new Date(subscriptionExpiresAt);
        }
        if (customLimits) {
            updateData.customLimits = customLimits;
        }
        // Update all users
        const result = await User_1.User.updateMany({ _id: { $in: userIds } }, { $set: updateData });
        // Log the admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'update_user',
            resource: 'user',
            details: {
                action: 'bulk_subscription_upgrade',
                userIds,
                newTier: subscriptionTier,
                newStatus: subscriptionStatus,
                customLimits: customLimits || null,
                usersAffected: result.modifiedCount
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({
            adminId: req.admin._id,
            userIds: userIds.length,
            newTier: subscriptionTier,
            usersAffected: result.modifiedCount
        }, 'Bulk user subscription upgrade by admin');
        res.json({
            success: true,
            message: `${result.modifiedCount} users upgraded to ${subscriptionTier} tier successfully`,
            usersAffected: result.modifiedCount
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error bulk upgrading users');
        res.status(500).json({
            success: false,
            error: 'Failed to bulk upgrade users'
        });
    }
}
async function getUserSubscriptionInfo(req, res) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Get subscription tier info
        const { SUBSCRIPTION_TIERS } = await Promise.resolve().then(() => __importStar(require('../config/subscription')));
        const tierInfo = SUBSCRIPTION_TIERS[user.subscriptionTier];
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                subscriptionTier: user.subscriptionTier,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionExpiresAt: user.subscriptionExpiresAt,
                customLimits: user.customLimits || null,
                currentTierInfo: tierInfo,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error getting user subscription info');
        res.status(500).json({
            success: false,
            error: 'Failed to get user subscription info'
        });
    }
}
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Log the admin action before deletion
        await AdminLog_1.AdminLog.create({
            adminId: req.admin._id.toString(),
            adminEmail: req.admin.email,
            action: 'delete_user',
            resource: 'user',
            resourceId: id,
            details: {
                userId: id,
                userEmail: user.email,
                userName: user.name
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        await User_1.User.findByIdAndDelete(id);
        logger_1.logger.info({
            adminId: req.admin._id,
            userId: id
        }, 'User deleted by admin');
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.id }, 'Error deleting user');
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
}
