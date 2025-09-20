"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTier = exports.requirePremium = exports.optionalAuth = exports.authenticate = void 0;
const mongodb_auth_service_1 = require("../services/mongodb-auth.service");
const logger_1 = require("../config/logger");
const authService = new mongodb_auth_service_1.MongoDBAuthService();
/**
 * Middleware to authenticate requests using JWT tokens
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authorization header missing or invalid',
                code: 'MISSING_AUTH_HEADER'
            });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const user = await authService.verifyToken(token);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error in authentication middleware');
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without user
            req.user = undefined;
            return next();
        }
        const token = authHeader.substring(7);
        const user = await authService.verifyToken(token);
        req.user = user || undefined;
        next();
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error in optional authentication middleware');
        // Don't fail on error, just continue without user
        req.user = undefined;
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Middleware to require premium subscription
 */
const requirePremium = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }
    if (!req.user.isPremium) {
        return res.status(403).json({
            error: 'Premium subscription required',
            code: 'PREMIUM_REQUIRED',
            details: {
                currentTier: req.user.subscriptionTier,
                requiredTier: 'premium'
            }
        });
    }
    next();
};
exports.requirePremium = requirePremium;
/**
 * Middleware to require specific subscription tier
 */
const requireTier = (requiredTier) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        const tierLevels = { free: 0, basic: 1, gold: 2, premium: 3 };
        const userLevel = tierLevels[req.user.subscriptionTier] || 0;
        const requiredLevel = tierLevels[requiredTier] || 0;
        if (userLevel < requiredLevel) {
            return res.status(403).json({
                error: `Subscription tier '${requiredTier}' or higher required`,
                code: 'TIER_REQUIRED',
                details: {
                    currentTier: req.user.subscriptionTier,
                    requiredTier: requiredTier
                }
            });
        }
        next();
    };
};
exports.requireTier = requireTier;
