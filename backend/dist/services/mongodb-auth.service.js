"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBAuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const subscription_1 = require("../config/subscription");
const logger_1 = require("../config/logger");
class MongoDBAuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    }
    /**
     * Register a new user
     */
    async register(data) {
        try {
            // Check if user already exists
            const existingUser = await User_1.User.findOne({ email: data.email });
            if (existingUser) {
                return {
                    success: false,
                    error: 'User with this email already exists'
                };
            }
            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcryptjs_1.default.hash(data.password, saltRounds);
            // Create new user
            const newUser = new User_1.User({
                email: data.email,
                password: hashedPassword,
                name: data.name,
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
                    language: data.preferences?.language || 'ha-NG',
                    theme: data.preferences?.theme || 'light',
                    autoPunctuation: data.preferences?.autoPunctuation ?? true,
                    cloudSync: data.preferences?.cloudSync ?? false
                },
                adWatchHistory: []
            });
            await newUser.save();
            // Generate JWT token
            const token = this.generateToken(newUser);
            // Convert to AuthUser format
            const authUser = this.convertToAuthUser(newUser);
            logger_1.logger.info({ userId: newUser._id, email: newUser.email }, 'User registered successfully');
            return {
                success: true,
                user: authUser,
                token
            };
        }
        catch (error) {
            logger_1.logger.error({ error, email: data.email }, 'Error during user registration');
            return {
                success: false,
                error: 'Registration failed. Please try again.'
            };
        }
    }
    /**
     * Login user with email and password
     */
    async login(data) {
        try {
            // Find user by email
            const user = await User_1.User.findOne({ email: data.email });
            if (!user) {
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            // Generate JWT token
            const token = this.generateToken(user);
            // Convert to AuthUser format
            const authUser = this.convertToAuthUser(user);
            logger_1.logger.info({ userId: user._id, email: user.email }, 'User logged in successfully');
            return {
                success: true,
                user: authUser,
                token
            };
        }
        catch (error) {
            logger_1.logger.error({ error, email: data.email }, 'Error during user login');
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    }
    /**
     * Verify JWT token and get user
     */
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            const user = await User_1.User.findById(decoded.userId);
            if (!user) {
                return null;
            }
            return this.convertToAuthUser(user);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Error verifying token');
            return null;
        }
    }
    /**
     * Get user profile by ID
     */
    async getUserProfile(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                return null;
            }
            return this.convertToAuthUser(user);
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
            const user = await User_1.User.findById(userId);
            if (!user) {
                return null;
            }
            // Update fields
            if (updates.name) {
                user.name = updates.name;
            }
            if (updates.preferences) {
                if (updates.preferences.language) {
                    user.preferences.language = updates.preferences.language;
                }
                if (updates.preferences.theme) {
                    user.preferences.theme = updates.preferences.theme;
                }
                if (updates.preferences.autoPunctuation !== undefined) {
                    user.preferences.autoPunctuation = updates.preferences.autoPunctuation;
                }
                if (updates.preferences.cloudSync !== undefined) {
                    user.preferences.cloudSync = updates.preferences.cloudSync;
                }
            }
            await user.save();
            return this.convertToAuthUser(user);
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Error updating user profile');
            return null;
        }
    }
    /**
     * Get subscription tiers
     */
    getSubscriptionTiers() {
        return subscription_1.SUBSCRIPTION_TIERS;
    }
    /**
     * Upgrade user subscription
     */
    async upgradeSubscription(userId, tier, paymentMethod) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    reason: 'User not found'
                };
            }
            // Validate tier
            if (!['basic', 'gold', 'premium'].includes(tier)) {
                return {
                    success: false,
                    reason: 'Invalid subscription tier'
                };
            }
            // Update subscription
            user.subscriptionTier = tier;
            user.subscriptionStatus = 'active';
            user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            await user.save();
            logger_1.logger.info({ userId, tier }, 'User subscription upgraded');
            return {
                success: true,
                user: this.convertToAuthUser(user)
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, tier }, 'Error upgrading subscription');
            return {
                success: false,
                reason: 'Failed to upgrade subscription'
            };
        }
    }
    /**
     * Cancel user subscription
     */
    async cancelSubscription(userId) {
        try {
            const user = await User_1.User.findById(userId);
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
            await user.save();
            logger_1.logger.info({ userId }, 'User subscription cancelled');
            return {
                success: true,
                user: this.convertToAuthUser(user)
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Error cancelling subscription');
            return {
                success: false,
                reason: 'Failed to cancel subscription'
            };
        }
    }
    /**
     * Generate JWT token
     */
    generateToken(user) {
        return jsonwebtoken_1.default.sign({
            userId: user._id.toString(),
            email: user.email,
            subscriptionTier: user.subscriptionTier
        }, this.jwtSecret, { expiresIn: '7d' });
    }
    /**
     * Convert IUser to AuthUser
     */
    convertToAuthUser(user) {
        return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            pointsBalance: user.pointsBalance,
            isPremium: user.subscriptionTier !== 'free',
            usageStats: {
                dailyMinutes: user.usageStats.dailyMinutes,
                monthlyMinutes: user.usageStats.monthlyMinutes,
                totalMinutes: user.usageStats.totalMinutes,
                transcriptsCount: user.usageStats.transcriptsCount
            }
        };
    }
}
exports.MongoDBAuthService = MongoDBAuthService;
