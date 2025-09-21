import { Router } from 'express';
import { MongoDBAuthService } from '../services/mongodb-auth.service';
import { UsageService } from '../services/usage.service';
import { authenticate, AuthenticatedRequest } from '../middleware/mongodb-auth';
import { logger } from '../config/logger';

const router = Router();
const authService = new MongoDBAuthService();
const usageService = new UsageService();

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, preferences } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    const result = await authService.register({
      email,
      password,
      name,
      preferences
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: 'REGISTRATION_FAILED'
      });
    }

    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token,
      message: 'User registered successfully'
    });

  } catch (error) {
    logger.error({ error }, 'Error during user registration');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const result = await authService.login({
      email,
      password
    });

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        code: 'LOGIN_FAILED'
      });
    }

    res.json({
      success: true,
      user: result.user,
      token: result.token,
      message: 'Login successful'
    });

  } catch (error) {
    logger.error({ error }, 'Error during user login');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh user token and get updated user data
 */
router.post('/refresh', authenticate as any, async (req: any, res) => {
  try {
    // Token is already verified by authenticate middleware
    const user = await authService.getUserProfile(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    logger.error({ error }, 'Error during token refresh');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate as any, async (req: any, res) => {
  try {
    const user = await authService.getUserProfile(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error getting user profile');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate as any, async (req: any, res) => {
  try {
    const { name, preferences } = req.body;
    
    const user = await authService.updateUserProfile(req.user!.id, {
      name,
      preferences
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error updating user profile');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/usage
 * Get user usage statistics
 */
router.get('/usage', authenticate as any, async (req: any, res) => {
  try {
    const stats = await usageService.getUserStats(req.user!.id);
    
    if (!stats) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error getting usage stats');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/subscription/tiers
 * Get available subscription tiers
 */
router.get('/subscription/tiers', (req, res) => {
  try {
    const tiers = authService.getSubscriptionTiers();
    
    res.json({
      success: true,
      tiers
    });

  } catch (error) {
    logger.error({ error }, 'Error getting subscription tiers');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/subscription/upgrade
 * Upgrade user subscription
 */
router.post('/subscription/upgrade', authenticate as any, async (req: any, res) => {
  try {
    const { tier, paymentMethod } = req.body;
    
    if (!tier || !['basic', 'gold', 'premium'].includes(tier)) {
      return res.status(400).json({
        error: 'Invalid subscription tier',
        code: 'INVALID_TIER'
      });
    }

    const result = await authService.upgradeSubscription(
      req.user!.id, 
      tier, 
      paymentMethod
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.reason || 'Failed to upgrade subscription',
        code: 'UPGRADE_FAILED'
      });
    }

    res.json({
      success: true,
      user: result.user,
      message: `Successfully upgraded to ${tier} tier`
    });

  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error upgrading subscription');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/subscription/cancel
 * Cancel user subscription
 */
router.post('/subscription/cancel', authenticate as any, async (req: any, res) => {
  try {
    const result = await authService.cancelSubscription(req.user!.id);

    if (!result.success) {
      return res.status(400).json({
        error: result.reason || 'Failed to cancel subscription',
        code: 'CANCEL_FAILED'
      });
    }

    res.json({
      success: true,
      user: result.user,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Error cancelling subscription');
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
