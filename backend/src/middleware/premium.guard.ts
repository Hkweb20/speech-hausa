import { Request, Response, NextFunction } from 'express';
import { UsageService } from '../services/usage.service';
import { SUBSCRIPTION_TIERS } from '../config/subscription';
import { logger } from '../config/logger';
import { AuthUser } from '../types/express';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware to check if user can perform transcription
 */
export const checkTranscriptionUsage = (source: 'live' | 'file_upload') => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Allow anonymous users with basic limits
      if (!req.user) {
        // For anonymous users, allow basic usage (e.g., 5 minutes per session)
        // This is a simple implementation - in production you might want IP-based tracking
        req.body._usageInfo = {
          userId: 'anonymous',
          minutes: 1, // Default 1 minute for anonymous
          source
        };
        return next();
      }

      const usageService = new UsageService();
      const requestedMinutes = req.body.duration || 1; // default 1 minute if not specified
      
      const result = await usageService.checkTranscriptionUsage(
        req.user.id,
        requestedMinutes,
        source
      );

      if (!result.allowed) {
        return res.status(403).json({
          error: 'Usage limit exceeded',
          code: 'USAGE_LIMIT_EXCEEDED',
          details: {
            reason: result.reason,
            remainingMinutes: result.remainingMinutes,
            tier: result.tier,
            resetTime: result.resetTime
          }
        });
      }

      // Add usage info to request for later recording
      req.body._usageInfo = {
        userId: req.user.id,
        minutes: requestedMinutes,
        source
      };

      next();
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Error in transcription usage check');
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user has premium feature access
 */
export const requirePremiumFeature = (feature: string) => {
  return (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
      }

      const tier = SUBSCRIPTION_TIERS[req.user.subscriptionTier];
      
      if (!tier.features.aiFeatures.includes(feature)) {
        return res.status(403).json({
          error: 'Premium feature required',
          code: 'PREMIUM_FEATURE_REQUIRED',
          details: {
            feature,
            currentTier: req.user.subscriptionTier,
            requiredTier: getRequiredTierForFeature(feature)
          }
        });
      }

      next();
    } catch (error) {
      logger.error({ error, userId: req.user?.id, feature }, 'Error in premium feature check');
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user has enough points for AI action
 */
export const requirePoints = (actionId: string, cost: number) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
      }

      const usageService = new UsageService();
      const result = await usageService.checkPointsAction(req.user.id, actionId, cost);

      if (!result.allowed) {
        return res.status(403).json({
          error: 'Insufficient points',
          code: 'INSUFFICIENT_POINTS',
          details: {
            actionId,
            cost,
            remainingPoints: result.remainingPoints,
            reason: result.reason
          }
        });
      }

      // Add points info to request for later spending
      req.body._pointsInfo = {
        userId: req.user.id,
        actionId,
        cost
      };

      next();
    } catch (error) {
      logger.error({ error, userId: req.user?.id, actionId, cost }, 'Error in points check');
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check file size limits
 */
export const checkFileSizeLimit = () => {
  return (req: any, res: Response, next: NextFunction) => {
    try {
      // Allow anonymous users with basic file size limits
      if (!req.user) {
        const file = req.file;
        const maxSizeMB = 10; // Basic limit for anonymous users (10MB)
        
        if (file && file.size > maxSizeMB * 1024 * 1024) {
          return res.status(413).json({
            error: 'File too large',
            code: 'FILE_TOO_LARGE',
            details: {
              fileSize: file.size / (1024 * 1024),
              maxSize: maxSizeMB,
              tier: 'anonymous'
            }
          });
        }
        return next();
      }

      const tier = SUBSCRIPTION_TIERS[req.user.subscriptionTier];
      const file = req.file;

      if (file && tier.features.maxFileSize > 0) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > tier.features.maxFileSize) {
          return res.status(413).json({
            error: 'File too large',
            code: 'FILE_TOO_LARGE',
            details: {
              fileSize: fileSizeMB,
              maxSize: tier.features.maxFileSize,
              tier: req.user.subscriptionTier
            }
          });
        }
      }

      next();
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Error in file size check');
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Helper function to get required tier for a feature
 */
function getRequiredTierForFeature(feature: string): string {
  const featureTierMap: Record<string, string> = {
    'basic_punctuation': 'free',
    'auto_capitalization': 'basic',
    'limited_summary': 'basic',
    'unlimited_summary': 'gold',
    'translation': 'gold',
    'speaker_diarization': 'gold',
    'keywords_extraction': 'gold',
    'sentiment_analysis': 'premium',
    'batch_processing': 'premium',
    'custom_vocabulary': 'premium'
  };

  return featureTierMap[feature] || 'premium';
}

/**
 * Middleware to record usage after successful operation
 */
export const recordUsage = () => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Record usage if this was a transcription request
      if (req.body._usageInfo) {
        const usageService = new UsageService();
        await usageService.recordUsage(
          req.body._usageInfo.userId,
          req.body._usageInfo.minutes,
          req.body._usageInfo.source
        );
      }

      // Spend points if this was a points-based action
      if (req.body._pointsInfo) {
        const usageService = new UsageService();
        await usageService.spendPoints(
          req.body._pointsInfo.userId,
          req.body._pointsInfo.actionId,
          req.body._pointsInfo.cost,
          `AI action: ${req.body._pointsInfo.actionId}`
        );
      }

      next();
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Error recording usage');
      // Don't fail the request if usage recording fails
      next();
    }
  };
};