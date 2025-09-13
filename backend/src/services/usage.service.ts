import { User, IUser } from '../models/User';
import { SUBSCRIPTION_TIERS } from '../config/subscription';
import { logger } from '../config/logger';

export interface UsageCheckResult {
  allowed: boolean;
  remainingMinutes: number;
  tier: string;
  resetTime?: Date;
  reason?: string;
}

export class UsageService {
  /**
   * Check if user can perform transcription based on their subscription tier
   */
  async checkTranscriptionUsage(
    userId: string, 
    requestedMinutes: number, 
    source: 'live' | 'file_upload'
  ): Promise<UsageCheckResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          allowed: false,
          remainingMinutes: 0,
          tier: 'free',
          reason: 'User not found'
        };
      }

      const tier = SUBSCRIPTION_TIERS[user.subscriptionTier];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const userLastReset = new Date(user.usageStats.lastResetDate);
      
      // Reset daily usage if it's a new day
      if (userLastReset < today) {
        user.usageStats.dailyMinutes = 0;
        user.usageStats.lastResetDate = today;
        await user.save();
      }

      // Check daily limits
      if (tier.features.dailyMinutes > 0) {
        const remainingDaily = tier.features.dailyMinutes - user.usageStats.dailyMinutes;
        if (remainingDaily < requestedMinutes) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          return {
            allowed: false,
            remainingMinutes: Math.max(0, remainingDaily),
            tier: user.subscriptionTier,
            resetTime: tomorrow,
            reason: `Daily limit exceeded. ${tier.features.dailyMinutes} minutes per day allowed.`
          };
        }
      }

      // Check monthly limits for paid tiers
      if (tier.features.monthlyMinutes > 0) {
        const remainingMonthly = tier.features.monthlyMinutes - user.usageStats.monthlyMinutes;
        if (remainingMonthly < requestedMinutes) {
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(1);
          
          return {
            allowed: false,
            remainingMinutes: Math.max(0, remainingMonthly),
            tier: user.subscriptionTier,
            resetTime: nextMonth,
            reason: `Monthly limit exceeded. ${tier.features.monthlyMinutes} minutes per month allowed.`
          };
        }
      }

      // Check file size limits for file uploads
      if (source === 'file_upload' && tier.features.maxFileSize > 0) {
        const maxFileMinutes = tier.features.maxFileSize;
        if (requestedMinutes > maxFileMinutes) {
          return {
            allowed: false,
            remainingMinutes: 0,
            tier: user.subscriptionTier,
            reason: `File too large. Maximum ${maxFileMinutes} minutes per file for ${user.subscriptionTier} tier.`
          };
        }
      }

      return {
        allowed: true,
        remainingMinutes: tier.features.dailyMinutes > 0 
          ? tier.features.dailyMinutes - user.usageStats.dailyMinutes - requestedMinutes
          : -1, // unlimited
        tier: user.subscriptionTier
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error checking usage limits');
      return {
        allowed: false,
        remainingMinutes: 0,
        tier: 'free',
        reason: 'Error checking usage limits'
      };
    }
  }

  /**
   * Record transcription usage
   */
  async recordUsage(
    userId: string, 
    minutes: number, 
    source: 'live' | 'file_upload'
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found for usage recording');
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const userLastReset = new Date(user.usageStats.lastResetDate);
      
      // Reset daily usage if it's a new day
      if (userLastReset < today) {
        user.usageStats.dailyMinutes = 0;
        user.usageStats.lastResetDate = today;
      }

      // Update usage stats
      user.usageStats.dailyMinutes += minutes;
      user.usageStats.monthlyMinutes += minutes;
      user.usageStats.totalMinutes += minutes;
      user.usageStats.transcriptsCount += 1;

      await user.save();
      
      logger.info({ 
        userId, 
        minutes, 
        source,
        dailyUsage: user.usageStats.dailyMinutes,
        monthlyUsage: user.usageStats.monthlyMinutes
      }, 'Usage recorded');

    } catch (error) {
      logger.error({ error, userId, minutes }, 'Error recording usage');
    }
  }

  /**
   * Check if user can perform AI action based on points balance
   */
  async checkPointsAction(
    userId: string, 
    actionId: string, 
    cost: number
  ): Promise<{ allowed: boolean; remainingPoints: number; reason?: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          allowed: false,
          remainingPoints: 0,
          reason: 'User not found'
        };
      }

      // Check if user has enough points
      if (user.pointsBalance < cost) {
        return {
          allowed: false,
          remainingPoints: user.pointsBalance,
          reason: `Insufficient points. Need ${cost}, have ${user.pointsBalance}`
        };
      }

      return {
        allowed: true,
        remainingPoints: user.pointsBalance - cost
      };

    } catch (error) {
      logger.error({ error, userId, actionId, cost }, 'Error checking points action');
      return {
        allowed: false,
        remainingPoints: 0,
        reason: 'Error checking points balance'
      };
    }
  }

  /**
   * Spend points for AI action
   */
  async spendPoints(
    userId: string, 
    actionId: string, 
    cost: number, 
    description: string
  ): Promise<{ success: boolean; remainingPoints: number; reason?: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          remainingPoints: 0,
          reason: 'User not found'
        };
      }

      // Check if user has enough points
      if (user.pointsBalance < cost) {
        return {
          success: false,
          remainingPoints: user.pointsBalance,
          reason: `Insufficient points. Need ${cost}, have ${user.pointsBalance}`
        };
      }

      // Deduct points
      user.pointsBalance -= cost;
      
      // Add to points history
      user.pointsHistory.push({
        type: 'spent',
        amount: cost,
        source: actionId as any,
        description,
        timestamp: new Date()
      });

      await user.save();

      logger.info({ 
        userId, 
        actionId, 
        cost, 
        remainingPoints: user.pointsBalance 
      }, 'Points spent');

      return {
        success: true,
        remainingPoints: user.pointsBalance
      };

    } catch (error) {
      logger.error({ error, userId, actionId, cost }, 'Error spending points');
      return {
        success: false,
        remainingPoints: 0,
        reason: 'Error spending points'
      };
    }
  }

  /**
   * Add points from ad watch
   */
  async addPointsFromAd(
    userId: string, 
    adId: string, 
    points: number
  ): Promise<{ success: boolean; newBalance: number; reason?: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          newBalance: 0,
          reason: 'User not found'
        };
      }

      const tier = SUBSCRIPTION_TIERS[user.subscriptionTier];
      
      // Check daily ad watch limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAds = user.adWatchHistory.filter(ad => 
        ad.timestamp >= today && ad.verified
      );

      if (todayAds.length >= tier.limits.dailyAdWatches) {
        return {
          success: false,
          newBalance: user.pointsBalance,
          reason: `Daily ad limit reached. ${tier.limits.dailyAdWatches} ads per day allowed.`
        };
      }

      // Check max points balance
      if (user.pointsBalance + points > tier.limits.maxPointsBalance) {
        return {
          success: false,
          newBalance: user.pointsBalance,
          reason: `Points balance limit reached. Maximum ${tier.limits.maxPointsBalance} points allowed.`
        };
      }

      // Add points
      user.pointsBalance += points;
      
      // Add to points history
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90); // 90 days expiry
      
      user.pointsHistory.push({
        type: 'earned',
        amount: points,
        source: 'ad_watch',
        description: `Watched ad: ${adId}`,
        timestamp: new Date(),
        expiresAt
      });

      // Add to ad watch history
      user.adWatchHistory.push({
        adId,
        pointsEarned: points,
        timestamp: new Date(),
        verified: true
      });

      await user.save();

      logger.info({ 
        userId, 
        adId, 
        points, 
        newBalance: user.pointsBalance 
      }, 'Points added from ad watch');

      return {
        success: true,
        newBalance: user.pointsBalance
      };

    } catch (error) {
      logger.error({ error, userId, adId, points }, 'Error adding points from ad');
      return {
        success: false,
        newBalance: 0,
        reason: 'Error adding points'
      };
    }
  }

  /**
   * Get user usage statistics
   */
  async getUserStats(userId: string): Promise<{
    usage: IUser['usageStats'];
    points: number;
    tier: string;
    limits: any;
  } | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      const tier = SUBSCRIPTION_TIERS[user.subscriptionTier];
      
      return {
        usage: user.usageStats,
        points: user.pointsBalance,
        tier: user.subscriptionTier,
        limits: {
          dailyMinutes: tier.features.dailyMinutes,
          monthlyMinutes: tier.features.monthlyMinutes,
          maxFileSize: tier.features.maxFileSize,
          maxTranscripts: tier.features.maxTranscripts,
          dailyAdWatches: tier.limits.dailyAdWatches,
          maxPointsBalance: tier.limits.maxPointsBalance
        }
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error getting user stats');
      return null;
    }
  }
}
