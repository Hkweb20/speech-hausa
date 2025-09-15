"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requirePremium = exports.optionalAuth = exports.authenticate = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_1 = require("../config/logger");
/**
 * Middleware to authenticate requests using Firebase ID token
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const authService = new auth_service_1.AuthService();
        const user = await authService.verifyToken(idToken);
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
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without user
            next();
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const authService = new auth_service_1.AuthService();
        const user = await authService.verifyToken(idToken);
        if (user) {
            req.user = user;
        }
        next();
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error in optional authentication middleware');
        // Don't fail the request, just continue without user
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Middleware to check if user is premium
 */
const requirePremium = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'UNAUTHENTICATED'
        });
    }
    if (req.user.subscriptionTier === 'free') {
        return res.status(403).json({
            error: 'Premium subscription required',
            code: 'PREMIUM_REQUIRED',
            details: {
                currentTier: req.user.subscriptionTier,
                upgradeUrl: '/subscription/upgrade'
            }
        });
    }
    next();
};
exports.requirePremium = requirePremium;
/**
 * Middleware to check if user is authenticated (any tier)
 */
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'UNAUTHENTICATED'
        });
    }
    next();
};
exports.requireAuth = requireAuth;
