import { AdminRequest } from '../middleware/admin-auth';
import { Response } from 'express';
import { SUBSCRIPTION_TIERS } from '../config/subscription';
import { AdminLog } from '../models/AdminLog';
import { logger } from '../config/logger';
import fs from 'fs';
import path from 'path';

export async function getSubscriptionTiers(req: AdminRequest, res: Response) {
  try {
    res.json({
      success: true,
      tiers: SUBSCRIPTION_TIERS
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

    if (!SUBSCRIPTION_TIERS[tierName]) {
      return res.status(404).json({
        success: false,
        error: 'Subscription tier not found'
      });
    }

    // Validate the updates
    const allowedFields = [
      'name', 'price', 'currency', 'billingCycle',
      'features.dailyMinutes', 'features.monthlyMinutes', 'features.maxFileSize',
      'features.maxTranscripts', 'features.exportFormats', 'features.aiFeatures',
      'features.cloudSync', 'features.offlineMode', 'features.prioritySupport',
      'features.apiAccess', 'features.dailyAIRequests', 'features.monthlyAIRequests',
      'features.dailyFileUploads', 'features.maxFileDuration',
      'features.dailyLiveRecordingMinutes', 'features.dailyRealTimeStreamingMinutes',
      'features.dailyTranslationMinutes',
      'limits.dailyAdWatches', 'limits.pointsPerAd', 'limits.maxPointsBalance',
      'description'
    ];

    // Deep merge the updates
    const updatedTier = { ...SUBSCRIPTION_TIERS[tierName] };
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        const keys = key.split('.');
        let current = updatedTier;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
      }
    }

    // Update the subscription tiers file
    const subscriptionPath = path.join(__dirname, '../config/subscription.ts');
    let subscriptionContent = fs.readFileSync(subscriptionPath, 'utf8');
    
    // This is a simplified approach - in production, you'd want a more robust config management system
    SUBSCRIPTION_TIERS[tierName] = updatedTier;

    // Log the admin action
    await AdminLog.create({
      adminId: req.admin!._id.toString(),
      adminEmail: req.admin!.email,
      action: 'update_limits',
      resource: 'subscription_tiers',
      resourceId: tierName,
      details: {
        tierName,
        updates,
        oldTier: SUBSCRIPTION_TIERS[tierName],
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
      if (!SUBSCRIPTION_TIERS[tierName]) {
        return res.status(400).json({
          success: false,
          error: `Invalid tier name: ${tierName}`
        });
      }
    }

    // Update all tiers
    const oldTiers = { ...SUBSCRIPTION_TIERS };
    Object.assign(SUBSCRIPTION_TIERS, tiers);

    // Log the admin action
    await AdminLog.create({
      adminId: req.admin!._id.toString(),
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
      tiers: SUBSCRIPTION_TIERS
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
      adminId: req.admin!._id.toString(),
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
