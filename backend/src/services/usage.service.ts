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

export interface FileUploadCheckResult {
  allowed: boolean;
  remainingUploads: number;
  maxFileDuration: number;
  tier: string;
  resetTime?: Date;
  reason?: string;
}

export interface LiveRecordingCheckResult {
  allowed: boolean;
  remainingMinutes: number;
  tier: string;
  resetTime?: Date;
  reason?: string;
}

export interface AIUsageCheckResult {
  allowed: boolean;
  remainingRequests: number;
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
   * Check if user can upload a file based on their subscription tier
   */
  async checkFileUploadUsage(
    userId: string, 
    fileDurationMinutes: number
  ): Promise<FileUploadCheckResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found for file upload check');
        return {
          allowed: false,
          remainingUploads: 0,
          maxFileDuration: 0,
          tier: 'free',
          reason: 'User not found'
        };
      }

      const tier = SUBSCRIPTION_TIERS[user.subscriptionTier];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const userLastReset = new Date(user.usageStats.lastResetDate);
      
      logger.info({ 
        userId, 
        subscriptionTier: user.subscriptionTier,
        dailyFileUploads: user.usageStats.dailyFileUploads,
        tierLimits: {
          dailyFileUploads: tier.features.dailyFileUploads,
          maxFileDuration: tier.features.maxFileDuration
        },
        fileDurationMinutes,
        userLastReset: userLastReset.toISOString(),
        today: today.toISOString()
      }, 'Checking file upload usage');
      
      // Reset daily usage if it's a new day
      if (userLastReset < today) {
        logger.info({ userId, userLastReset: userLastReset.toISOString(), today: today.toISOString() }, 'Resetting daily file uploads for new day');
        user.usageStats.dailyFileUploads = 0;
        user.usageStats.lastResetDate = today;
        await user.save();
      }

      // Check file duration limit
      if (tier.features.maxFileDuration > 0 && fileDurationMinutes > tier.features.maxFileDuration) {
        logger.warn({ 
          userId, 
          fileDurationMinutes, 
          maxFileDuration: tier.features.maxFileDuration,
          subscriptionTier: user.subscriptionTier 
        }, 'File duration limit exceeded');
        
        return {
          allowed: false,
          remainingUploads: tier.features.dailyFileUploads - user.usageStats.dailyFileUploads,
          maxFileDuration: tier.features.maxFileDuration,
          tier: user.subscriptionTier,
          reason: `File too long. Maximum ${tier.features.maxFileDuration} minutes per file for ${user.subscriptionTier} tier.`
        };
      }

      // Check daily upload limit
      if (tier.features.dailyFileUploads > 0) {
        const remainingUploads = tier.features.dailyFileUploads - user.usageStats.dailyFileUploads;
        
        logger.info({ 
          userId, 
          dailyFileUploads: user.usageStats.dailyFileUploads,
          maxDailyFileUploads: tier.features.dailyFileUploads,
          remainingUploads,
          subscriptionTier: user.subscriptionTier
        }, 'Checking daily upload limit');
        
        if (remainingUploads <= 0) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          logger.warn({ 
            userId, 
            dailyFileUploads: user.usageStats.dailyFileUploads,
            maxDailyFileUploads: tier.features.dailyFileUploads,
            subscriptionTier: user.subscriptionTier 
          }, 'Daily upload limit exceeded');
          
          return {
            allowed: false,
            remainingUploads: 0,
            maxFileDuration: tier.features.maxFileDuration,
            tier: user.subscriptionTier,
            resetTime: tomorrow,
            reason: `Daily upload limit exceeded. ${tier.features.dailyFileUploads} uploads per day allowed.`
          };
        }

        logger.info({ 
          userId, 
          remainingUploads: remainingUploads - 1,
          subscriptionTier: user.subscriptionTier 
        }, 'File upload allowed');

        return {
          allowed: true,
          remainingUploads: remainingUploads - 1, // -1 for this upload
          maxFileDuration: tier.features.maxFileDuration,
          tier: user.subscriptionTier
        };
      }

      // Unlimited uploads
      logger.info({ userId, subscriptionTier: user.subscriptionTier }, 'Unlimited file uploads allowed');
      return {
        allowed: true,
        remainingUploads: -1, // unlimited
        maxFileDuration: tier.features.maxFileDuration,
        tier: user.subscriptionTier
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error checking file upload limits');
      return {
        allowed: false,
        remainingUploads: 0,
        maxFileDuration: 0,
        tier: 'free',
        reason: 'Error checking file upload limits'
      };
    }
  }

  /**
   * Check if user can perform live recording based on their subscription tier
   */
  async checkLiveRecordingUsage(
    userId: string, 
    requestedMinutes: number
  ): Promise<LiveRecordingCheckResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found for live recording check');
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
      
      logger.info({ 
        userId, 
        subscriptionTier: user.subscriptionTier,
        dailyLiveRecordingMinutes: user.usageStats.dailyLiveRecordingMinutes,
        tierLimits: {
          dailyLiveRecordingMinutes: tier.features.dailyLiveRecordingMinutes
        },
        requestedMinutes,
        userLastReset: userLastReset.toISOString(),
        today: today.toISOString()
      }, 'Checking live recording usage');
      
      // Reset daily usage if it's a new day
      if (userLastReset < today) {
        logger.info({ userId, userLastReset: userLastReset.toISOString(), today: today.toISOString() }, 'Resetting daily live recording minutes for new day');
        user.usageStats.dailyLiveRecordingMinutes = 0;
        user.usageStats.lastResetDate = today;
        await user.save();
      }

      // Check daily live recording limit
      if (tier.features.dailyLiveRecordingMinutes > 0) {
        const remainingMinutes = tier.features.dailyLiveRecordingMinutes - user.usageStats.dailyLiveRecordingMinutes;
        
        logger.info({ 
          userId, 
          dailyLiveRecordingMinutes: user.usageStats.dailyLiveRecordingMinutes,
          maxDailyLiveRecordingMinutes: tier.features.dailyLiveRecordingMinutes,
          remainingMinutes,
          subscriptionTier: user.subscriptionTier
        }, 'Checking daily live recording limit');
        
        if (remainingMinutes < requestedMinutes) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          logger.warn({ 
            userId, 
            dailyLiveRecordingMinutes: user.usageStats.dailyLiveRecordingMinutes,
            maxDailyLiveRecordingMinutes: tier.features.dailyLiveRecordingMinutes,
            subscriptionTier: user.subscriptionTier 
          }, 'Daily live recording limit exceeded');
          
          return {
            allowed: false,
            remainingMinutes: Math.max(0, remainingMinutes),
            tier: user.subscriptionTier,
            resetTime: tomorrow,
            reason: `Daily live recording limit exceeded. ${tier.features.dailyLiveRecordingMinutes} minutes per day allowed.`
          };
        }

        logger.info({ 
          userId, 
          remainingMinutes: remainingMinutes - requestedMinutes,
          subscriptionTier: user.subscriptionTier 
        }, 'Live recording allowed');

        return {
          allowed: true,
          remainingMinutes: remainingMinutes - requestedMinutes,
          tier: user.subscriptionTier
        };
      }

      // Unlimited live recording
      logger.info({ userId, subscriptionTier: user.subscriptionTier }, 'Unlimited live recording allowed');
      return {
        allowed: true,
        remainingMinutes: -1, // unlimited
        tier: user.subscriptionTier
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error checking live recording limits');
      return {
        allowed: false,
        remainingMinutes: 0,
        tier: 'free',
        reason: 'Error checking live recording limits'
      };
    }
  }

  /**
   * Record live recording usage
   */
  async recordLiveRecordingUsage(
    userId: string, 
    minutes: number
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found for live recording usage recording');
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const userLastReset = new Date(user.usageStats.lastResetDate);
      
      logger.info({ 
        userId, 
        subscriptionTier: user.subscriptionTier,
        beforeReset: {
          dailyLiveRecordingMinutes: user.usageStats.dailyLiveRecordingMinutes,
          lastResetDate: userLastReset.toISOString()
        },
        today: today.toISOString(),
        minutes
      }, 'Recording live recording usage');
      
      // Reset daily usage if it's a new day
      if (userLastReset < today) {
        logger.info({ userId, userLastReset: userLastReset.toISOString(), today: today.toISOString() }, 'Resetting daily live recording minutes for new day');
        user.usageStats.dailyLiveRecordingMinutes = 0;
        user.usageStats.lastResetDate = today;
      }

      // Update live recording stats
      const oldDailyMinutes = user.usageStats.dailyLiveRecordingMinutes;
      user.usageStats.dailyLiveRecordingMinutes += minutes;
      user.usageStats.monthlyLiveRecordingMinutes += minutes;
      user.usageStats.totalLiveRecordingMinutes += minutes;
      
      // Also update general transcription stats
      user.usageStats.dailyMinutes += minutes;
      user.usageStats.monthlyMinutes += minutes;
      user.usageStats.totalMinutes += minutes;
      user.usageStats.transcriptsCount += 1;

      await user.save();
      
      logger.info({ 
        userId, 
        subscriptionTier: user.subscriptionTier,
        minutes,
        liveRecording: {
          before: oldDailyMinutes,
          after: user.usageStats.dailyLiveRecordingMinutes,
          monthly: user.usageStats.monthlyLiveRecordingMinutes,
          total: user.usageStats.totalLiveRecordingMinutes
        },
        general: {
          daily: user.usageStats.dailyMinutes,
          monthly: user.usageStats.monthlyMinutes,
          total: user.usageStats.totalMinutes
        }
      }, 'Live recording usage recorded successfully');

    } catch (error) {
      logger.error({ error, userId, minutes }, 'Error recording live recording usage');
    }
  }

  /**
   * Record file upload usage
   */
  async recordFileUploadUsage(
    userId: string, 
    fileDurationMinutes: number
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found for file upload usage recording');
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const userLastReset = new Date(user.usageStats.lastResetDate);
      
      logger.info({ 
        userId, 
        subscriptionTier: user.subscriptionTier,
        beforeReset: {
          dailyFileUploads: user.usageStats.dailyFileUploads,
          lastResetDate: userLastReset.toISOString()
        },
        today: today.toISOString(),
        fileDurationMinutes
      }, 'Recording file upload usage');
      
      // Reset daily usage if it's a new day
      if (userLastReset < today) {
        logger.info({ userId, userLastReset: userLastReset.toISOString(), today: today.toISOString() }, 'Resetting daily file uploads for new day');
        user.usageStats.dailyFileUploads = 0;
        user.usageStats.lastResetDate = today;
      }

      // Update file upload stats
      const oldDailyUploads = user.usageStats.dailyFileUploads;
      user.usageStats.dailyFileUploads += 1;
      user.usageStats.monthlyFileUploads += 1;
      user.usageStats.totalFileUploads += 1;
      
      // Also update general transcription stats
      user.usageStats.dailyMinutes += fileDurationMinutes;
      user.usageStats.monthlyMinutes += fileDurationMinutes;
      user.usageStats.totalMinutes += fileDurationMinutes;
      user.usageStats.transcriptsCount += 1;

      await user.save();
      
      logger.info({ 
        userId, 
        subscriptionTier: user.subscriptionTier,
        fileDurationMinutes,
        uploads: {
          before: oldDailyUploads,
          after: user.usageStats.dailyFileUploads,
          monthly: user.usageStats.monthlyFileUploads,
          total: user.usageStats.totalFileUploads
        },
        minutes: {
          daily: user.usageStats.dailyMinutes,
          monthly: user.usageStats.monthlyMinutes,
          total: user.usageStats.totalMinutes
        }
      }, 'File upload usage recorded successfully');

    } catch (error) {
      logger.error({ error, userId, fileDurationMinutes }, 'Error recording file upload usage');
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
                  maxPointsBalance: tier.limits.maxPointsBalance,
                  // File upload limits
                  dailyFileUploads: tier.features.dailyFileUploads,
                  maxFileDuration: tier.features.maxFileDuration,
                  // Live recording limits
                  dailyLiveRecordingMinutes: tier.features.dailyLiveRecordingMinutes
                }
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error getting user stats');
      return null;
    }
  }

  /**
   * Check if user can perform AI operations based on their subscription tier
   */
  async checkAIUsage(userId: string, requestedRequests: number = 1): Promise<AIUsageCheckResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          allowed: false,
          remainingRequests: 0,
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
        user.usageStats.dailyAIRequests = 0;
        user.usageStats.lastResetDate = today;
        await user.save();
      }

      // Get AI limits based on tier
      const dailyLimit = tier.features.dailyAIRequests || 5; // Default 5 for free users
      const monthlyLimit = tier.features.monthlyAIRequests || 150; // Default 150 for free users

      // Check daily limits
      if (dailyLimit > 0) {
        const remainingDaily = dailyLimit - user.usageStats.dailyAIRequests;
        if (remainingDaily < requestedRequests) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return {
            allowed: false,
            remainingRequests: remainingDaily,
            tier: user.subscriptionTier,
            resetTime: tomorrow,
            reason: 'Daily AI request limit exceeded'
          };
        }
      }

      // Check monthly limits
      if (monthlyLimit > 0) {
        const remainingMonthly = monthlyLimit - user.usageStats.monthlyAIRequests;
        if (remainingMonthly < requestedRequests) {
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getDate() + 1);
          return {
            allowed: false,
            remainingRequests: remainingMonthly,
            tier: user.subscriptionTier,
            resetTime: nextMonth,
            reason: 'Monthly AI request limit exceeded'
          };
        }
      }

      return {
        allowed: true,
        remainingRequests: Math.min(
          dailyLimit - user.usageStats.dailyAIRequests,
          monthlyLimit - user.usageStats.monthlyAIRequests
        ),
        tier: user.subscriptionTier
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error checking AI usage');
      return {
        allowed: false,
        remainingRequests: 0,
        tier: 'free',
        reason: 'Error checking usage limits'
      };
    }
  }

  /**
   * Record AI usage for a user
   */
  async recordAIUsage(userId: string, requests: number = 1): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found when recording AI usage');
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const userLastReset = new Date(user.usageStats.lastResetDate);
      
      // Reset daily usage if it's a new day
      if (userLastReset < today) {
        user.usageStats.dailyAIRequests = 0;
        user.usageStats.lastResetDate = today;
      }

      // Update usage stats
      user.usageStats.dailyAIRequests += requests;
      user.usageStats.monthlyAIRequests += requests;
      user.usageStats.totalAIRequests += requests;

      await user.save();

      logger.info({ 
        userId, 
        requests, 
        dailyAIRequests: user.usageStats.dailyAIRequests,
        monthlyAIRequests: user.usageStats.monthlyAIRequests
      }, 'AI usage recorded');

    } catch (error) {
      logger.error({ error, userId, requests }, 'Error recording AI usage');
    }
  }

  /**
   * Get AI usage statistics for a user
   */
  async getAIUsage(userId: string): Promise<{
    dailyRequests: number;
    monthlyRequests: number;
    totalRequests: number;
    remainingRequests: number;
    tier: string;
    resetTime: Date | null;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          dailyRequests: 0,
          monthlyRequests: 0,
          totalRequests: 0,
          remainingRequests: 5,
          tier: 'free',
          resetTime: null
        };
      }

      const tier = SUBSCRIPTION_TIERS[user.subscriptionTier];
      const dailyLimit = tier.features.dailyAIRequests || 5;
      const monthlyLimit = tier.features.monthlyAIRequests || 150;

      const remainingRequests = Math.min(
        dailyLimit - user.usageStats.dailyAIRequests,
        monthlyLimit - user.usageStats.monthlyAIRequests
      );

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        dailyRequests: user.usageStats.dailyAIRequests,
        monthlyRequests: user.usageStats.monthlyAIRequests,
        totalRequests: user.usageStats.totalAIRequests,
        remainingRequests: Math.max(0, remainingRequests),
        tier: user.subscriptionTier,
        resetTime: tomorrow
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error getting AI usage');
      return {
        dailyRequests: 0,
        monthlyRequests: 0,
        totalRequests: 0,
        remainingRequests: 5,
        tier: 'free',
        resetTime: null
      };
    }
  }
}
