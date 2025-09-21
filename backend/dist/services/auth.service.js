"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const User_1 = require("../models/User");
const subscription_1 = require("../config/subscription");
const logger_1 = require("../config/logger");
class AuthService {
    constructor() {
        // Initialize Firebase Admin if not already initialized
        if (firebase_admin_1.default.apps.length === 0) {
            this.firebaseApp = firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        }
        else {
            this.firebaseApp = firebase_admin_1.default.app();
        }
    }
    /**
     * Verify Firebase ID token and get user info
     */
    async verifyToken(idToken) {
        try {
            const decodedToken = await firebase_admin_1.default.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            // Get or create user in our database
            let user = await User_1.User.findOne({ id: uid });
            if (!user) {
                // Create new user
                user = await this.createUser(uid, decodedToken);
            }
            else {
                // Update last login
                user.lastLogin = new Date();
                await user.save();
            }
            if (!user) {
                throw new Error('User not found after creation');
            }
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                subscriptionTier: user.subscriptionTier,
                subscriptionStatus: user.subscriptionStatus,
                pointsBalance: user.pointsBalance,
                isPremium: user.subscriptionTier !== 'free',
                usageStats: user.usageStats
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Error verifying Firebase token');
            return null;
        }
    }
    /**
     * Create new user in database
     */
    async createUser(uid, decodedToken) {
        try {
            const user = new User_1.User({
                id: uid,
                email: decodedToken.email || '',
                name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
                subscriptionTier: 'free',
                subscriptionStatus: 'active',
                usageStats: {
                    dailyMinutes: 0,
                    monthlyMinutes: 0,
                    totalMinutes: 0,
                    transcriptsCount: 0,
                    lastResetDate: new Date()
                },
                pointsBalance: 0,
                pointsHistory: [],
                preferences: {
                    language: 'ha-NG',
                    theme: 'light',
                    autoPunctuation: true,
                    cloudSync: false
                },
                adWatchHistory: []
            });
            await user.save();
            logger_1.logger.info({ userId: uid, email: decodedToken.email }, 'New user created');
            return user;
        }
        catch (error) {
            logger_1.logger.error({ error, uid }, 'Error creating user');
            throw error;
        }
    }
    /**
     * Get user profile
     */
    async getUserProfile(userId) {
        try {
            const user = await User_1.User.findOne({ id: userId });
            if (!user) {
                return null;
            }
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                subscriptionTier: user.subscriptionTier,
                subscriptionStatus: user.subscriptionStatus,
                pointsBalance: user.pointsBalance,
                isPremium: user.subscriptionTier !== 'free',
                usageStats: user.usageStats
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Error getting user profile');
            return null;
        }
    }
    /**
     * Update user profile
     */
    async updateUserProfile(userId, updates) {
        try {
            const user = await User_1.User.findOne({ id: userId });
            if (!user) {
                return null;
            }
            if (updates.name) {
                user.name = updates.name;
            }
            if (updates.preferences) {
                user.preferences = {
                    ...user.preferences,
                    ...updates.preferences
                };
            }
            await user.save();
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                subscriptionTier: user.subscriptionTier,
                subscriptionStatus: user.subscriptionStatus,
                pointsBalance: user.pointsBalance,
                isPremium: user.subscriptionTier !== 'free',
                usageStats: user.usageStats
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, updates }, 'Error updating user profile');
            return null;
        }
    }
    /**
     * Upgrade user subscription
     */
    async upgradeSubscription(userId, newTier, paymentMethod) {
        try {
            const user = await User_1.User.findOne({ id: userId });
            if (!user) {
                return {
                    success: false,
                    reason: 'User not found'
                };
            }
            const tier = subscription_1.SUBSCRIPTION_TIERS[newTier];
            // Update user subscription
            user.subscriptionTier = newTier;
            user.subscriptionStatus = 'active';
            user.subscriptionExpiresAt = new Date();
            user.subscriptionExpiresAt.setMonth(user.subscriptionExpiresAt.getMonth() + 1);
            // Reset usage stats for new billing cycle
            user.usageStats.dailyMinutes = 0;
            user.usageStats.monthlyMinutes = 0;
            user.usageStats.lastResetDate = new Date();
            // Enable cloud sync for paid tiers
            if (['basic', 'gold', 'premium'].includes(newTier)) {
                user.preferences.cloudSync = true;
            }
            await user.save();
            logger_1.logger.info({
                userId,
                newTier,
                price: tier.price
            }, 'User subscription upgraded');
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    subscriptionTier: user.subscriptionTier,
                    subscriptionStatus: user.subscriptionStatus,
                    pointsBalance: user.pointsBalance,
                    isPremium: user.subscriptionTier !== 'free',
                    usageStats: user.usageStats
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, newTier }, 'Error upgrading subscription');
            return {
                success: false,
                reason: 'Error upgrading subscription'
            };
        }
    }
    /**
     * Cancel user subscription
     */
    async cancelSubscription(userId) {
        try {
            const user = await User_1.User.findOne({ id: userId });
            if (!user) {
                return {
                    success: false,
                    reason: 'User not found'
                };
            }
            // Downgrade to free tier
            user.subscriptionTier = 'free';
            user.subscriptionStatus = 'cancelled';
            user.subscriptionExpiresAt = undefined;
            user.preferences.cloudSync = false;
            await user.save();
            logger_1.logger.info({ userId }, 'User subscription cancelled');
            return {
                success: true
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Error cancelling subscription');
            return {
                success: false,
                reason: 'Error cancelling subscription'
            };
        }
    }
    /**
     * Get subscription tiers for display
     */
    getSubscriptionTiers() {
        return Object.entries(subscription_1.SUBSCRIPTION_TIERS).map(([key, tier]) => ({
            id: key,
            name: tier.name,
            price: tier.price,
            currency: tier.currency,
            billingCycle: tier.billingCycle,
            features: tier.features,
            limits: tier.limits,
            description: tier.description
        }));
    }
}
exports.AuthService = AuthService;
