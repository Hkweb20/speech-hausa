import { Request, Response, NextFunction } from 'express';
import { MongoDBAuthService, AuthUser } from '../services/mongodb-auth.service';
import { logger } from '../config/logger';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const authService = new MongoDBAuthService();

/**
 * Middleware to authenticate requests using JWT tokens
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

  } catch (error) {
    logger.error({ error }, 'Error in authentication middleware');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

  } catch (error) {
    logger.error({ error }, 'Error in optional authentication middleware');
    // Don't fail on error, just continue without user
    req.user = undefined;
    next();
  }
};

/**
 * Middleware to require premium subscription
 */
export const requirePremium = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

/**
 * Middleware to require specific subscription tier
 */
export const requireTier = (requiredTier: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const tierLevels = { free: 0, basic: 1, gold: 2, premium: 3 };
    const userLevel = tierLevels[req.user.subscriptionTier as keyof typeof tierLevels] || 0;
    const requiredLevel = tierLevels[requiredTier as keyof typeof tierLevels] || 0;

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

