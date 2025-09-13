import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../config/logger';
import { AuthUser } from '../types/express';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware to authenticate requests using Firebase ID token
 */
export const authenticate = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header required',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const authService = new AuthService();
    const user = await authService.verifyToken(idToken);

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
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const authService = new AuthService();
    const user = await authService.verifyToken(idToken);

    if (user) {
      req.user = user;
    }

    next();

  } catch (error) {
    logger.error({ error }, 'Error in optional authentication middleware');
    // Don't fail the request, just continue without user
    next();
  }
};

/**
 * Middleware to check if user is premium
 */
export const requirePremium = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
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

/**
 * Middleware to check if user is authenticated (any tier)
 */
export const requireAuth = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }

  next();
};
