import { Router } from 'express';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express.d';
import { pushNotificationService } from '../services/push-notification.service';
import { authenticate } from '../middleware/mongodb-auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';

const router = Router();

// Register device token for push notifications
router.post('/register-token', authenticate as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { token, platform } = req.body;
  
  if (!token || !platform) {
    return res.status(400).json({
      success: false,
      error: 'Token and platform are required'
    });
  }

  if (!['ios', 'android'].includes(platform)) {
    return res.status(400).json({
      success: false,
      error: 'Platform must be ios or android'
    });
  }

  pushNotificationService.registerDeviceToken(userId, token, platform);
  
  res.json({
    success: true,
    message: 'Device token registered successfully'
  });
}));

// Unregister device token
router.delete('/unregister-token', authenticate as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required'
    });
  }

  pushNotificationService.unregisterDeviceToken(userId, token);
  
  res.json({
    success: true,
    message: 'Device token unregistered successfully'
  });
}));

// Get user's device tokens (for debugging)
router.get('/tokens', authenticate as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const tokens = pushNotificationService.getUserTokens(userId);
  
  res.json({
    success: true,
    data: {
      tokens: tokens.map(token => ({
        platform: token.platform,
        lastActive: token.lastActive,
        // Don't expose the actual token for security
        token: token.token.substring(0, 8) + '...'
      }))
    }
  });
}));

// Send test notification (for testing purposes)
router.post('/test', authenticate as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { title, body } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({
      success: false,
      error: 'Title and body are required'
    });
  }

  await pushNotificationService.sendToUser(userId, {
    title,
    body,
    data: {
      type: 'test',
      timestamp: new Date().toISOString()
    }
  });
  
  res.json({
    success: true,
    message: 'Test notification sent'
  });
}));

export default router;

