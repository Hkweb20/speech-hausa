import { AdminRequest } from '../middleware/admin-auth';
import { Response } from 'express';
import { subscriptionTiersService } from '../services/subscription-tiers.service';
import { AdminLog } from '../models/AdminLog';
import { logger } from '../config/logger';
import { dailyResetService } from '../services/daily-reset.service';

export async function getSubscriptionTiers(req: AdminRequest, res: Response) {
  try {
    const tiers = subscriptionTiersService.getTiers();
    res.json({
      success: true,
      tiers
    });
  } catch (error) {
    logger.error({ error }, 'Error getting subscription tiers');
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription tiers'
    });
  }
}

export async function updateSubscriptionTier(req: AdminRequest, res: Response) {
  try {
    const { tierName } = req.params;
    const updates = req.body;

    const currentTier = subscriptionTiersService.getTier(tierName);
    if (!currentTier) {
      return res.status(404).json({
        success: false,
        error: 'Subscription tier not found'
      });
    }

    // Update the tier using the centralized service
    const success = subscriptionTiersService.updateTier(tierName, updates);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update subscription tier'
      });
    }

    const updatedTier = subscriptionTiersService.getTier(tierName);

    // Log the admin action
    await AdminLog.create({
      adminId: (req.admin!._id as any).toString(),
      adminEmail: req.admin!.email,
      action: 'update_limits',
      resource: 'subscription_tiers',
      resourceId: tierName,
      details: {
        tierName,
        updates,
        oldTier: currentTier,
        newTier: updatedTier
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    logger.info({ 
      adminId: req.admin!._id, 
      tierName, 
      updates 
    }, 'Subscription tier updated');

    res.json({
      success: true,
      message: `Subscription tier '${tierName}' updated successfully`,
      tier: updatedTier
    });

  } catch (error) {
    logger.error({ error }, 'Error updating subscription tier');
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription tier'
    });
  }
}

export async function updateAllSubscriptionTiers(req: AdminRequest, res: Response) {
  try {
    const { tiers } = req.body;

    if (!tiers || typeof tiers !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid tiers data provided'
      });
    }

    // Validate each tier
    for (const [tierName, tierData] of Object.entries(tiers)) {
      if (!subscriptionTiersService.getTier(tierName)) {
        return res.status(400).json({
          success: false,
          error: `Invalid tier name: ${tierName}`
        });
      }
    }

    // Get old tiers for logging
    const oldTiers = subscriptionTiersService.getTiers();

    // Update all tiers using the centralized service
    const success = subscriptionTiersService.updateAllTiers(tiers);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update subscription tiers'
      });
    }

    const updatedTiers = subscriptionTiersService.getTiers();

    // Log the admin action
    await AdminLog.create({
      adminId: (req.admin!._id as any).toString(),
      adminEmail: req.admin!.email,
      action: 'update_limits',
      resource: 'subscription_tiers',
      details: {
        oldTiers,
        newTiers: tiers
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    logger.info({ 
      adminId: req.admin!._id, 
      tiersCount: Object.keys(tiers).length 
    }, 'All subscription tiers updated');

    res.json({
      success: true,
      message: 'All subscription tiers updated successfully',
      tiers: updatedTiers
    });

  } catch (error) {
    logger.error({ error }, 'Error updating all subscription tiers');
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription tiers'
    });
  }
}

export async function resetAllDailyLimits(req: AdminRequest, res: Response) {
  try {
    const { User } = await import('../models/User');
    
    // Reset daily limits for all users
    const result = await User.updateMany(
      {},
      {
        $set: {
          'usageStats.dailyMinutes': 0,
          'usageStats.dailyFileUploads': 0,
          'usageStats.dailyLiveRecordingMinutes': 0,
          'usageStats.dailyRealTimeStreamingMinutes': 0,
          'usageStats.dailyTranslationMinutes': 0,
          'usageStats.dailyAIRequests': 0,
          'usageStats.lastResetDate': new Date()
        }
      }
    );

    // Log the admin action
    await AdminLog.create({
      adminId: (req.admin!._id as any).toString(),
      adminEmail: req.admin!.email,
      action: 'system_reset',
      resource: 'user_limits',
      details: {
        resetType: 'daily_limits',
        usersAffected: result.modifiedCount
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    logger.info({ 
      adminId: req.admin!._id, 
      usersAffected: result.modifiedCount 
    }, 'All daily limits reset');

    res.json({
      success: true,
      message: `Daily limits reset for ${result.modifiedCount} users`
    });

  } catch (error) {
    logger.error({ error }, 'Error resetting daily limits');
    res.status(500).json({
      success: false,
      error: 'Failed to reset daily limits'
    });
  }
}

export async function getDailyResetStatus(req: AdminRequest, res: Response) {
  try {
    const status = dailyResetService.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error({ error }, 'Error getting daily reset status');
    res.status(500).json({
      success: false,
      error: 'Failed to get daily reset status'
    });
  }
}

export async function triggerDailyReset(req: AdminRequest, res: Response) {
  try {
    await dailyResetService.triggerManualReset();
    
    // Log the admin action (with error handling)
    try {
      await AdminLog.create({
        adminId: (req.admin!._id as any).toString(),
        adminEmail: req.admin!.email,
        action: 'manual_daily_reset',
        resource: 'user_limits',
        details: {
          resetType: 'daily_limits_manual',
          triggeredBy: 'admin'
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      });
    } catch (logError) {
      logger.warn({ logError }, 'Failed to log manual reset action');
    }

    logger.info({ 
      adminId: req.admin!._id 
    }, 'Manual daily reset triggered by admin');

    res.json({
      success: true,
      message: 'Daily reset triggered successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error triggering daily reset');
    res.status(500).json({
      success: false,
      error: 'Failed to trigger daily reset'
    });
  }
}
