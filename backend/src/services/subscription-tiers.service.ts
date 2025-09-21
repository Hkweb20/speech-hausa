import { SUBSCRIPTION_TIERS, SubscriptionTier } from '../config/subscription';
import { logger } from '../config/logger';

/**
 * Centralized service for managing subscription tiers
 * This ensures all services get the latest tier data after admin updates
 */
class SubscriptionTiersService {
  private tiers: Record<string, SubscriptionTier> = { ...SUBSCRIPTION_TIERS };

  constructor() {
    // Force update premium tier to 90 on startup
    this.updateTier('premium', {
      features: {
        dailyMinutes: 300,
        monthlyMinutes: 9000,
        maxFileSize: 300,
        maxTranscripts: 1000,
        exportFormats: ['json', 'txt', 'csv', 'srt', 'vtt'],
        aiFeatures: ['summarization', 'translation', 'speaker_detection'],
        cloudSync: true,
        offlineMode: true,
        prioritySupport: true,
        apiAccess: true,
        dailyAIRequests: 100,
        monthlyAIRequests: 3000,
        dailyFileUploads: 90,
        maxFileDuration: 300,
        dailyLiveRecordingMinutes: 60,
        dailyRealTimeStreamingMinutes: 120,
        dailyTranslationMinutes: 180
      }
    });
  }

  /**
   * Get all subscription tiers
   */
  getTiers(): Record<string, SubscriptionTier> {
    return { ...this.tiers };
  }

  /**
   * Get a specific subscription tier
   */
  getTier(tierName: string): SubscriptionTier | null {
    return this.tiers[tierName] || null;
  }

  /**
   * Update a subscription tier
   */
  updateTier(tierName: string, updates: Partial<SubscriptionTier>): boolean {
    // Force restart to clear any cached values
    if (!this.tiers[tierName]) {
      logger.warn({ tierName }, 'Attempted to update non-existent tier');
      return false;
    }

    try {
      // Deep merge the updates
      const updatedTier = this.deepMerge(this.tiers[tierName], updates);
      this.tiers[tierName] = updatedTier;
      
      logger.info({ tierName, updates }, 'Subscription tier updated successfully');
      return true;
    } catch (error) {
      logger.error({ error, tierName, updates }, 'Failed to update subscription tier');
      return false;
    }
  }

  /**
   * Update multiple subscription tiers
   */
  updateAllTiers(tiers: Record<string, Partial<SubscriptionTier>>): boolean {
    try {
      for (const [tierName, updates] of Object.entries(tiers)) {
        if (!this.tiers[tierName]) {
          logger.warn({ tierName }, 'Attempted to update non-existent tier');
          continue;
        }
        
        const updatedTier = this.deepMerge(this.tiers[tierName], updates);
        this.tiers[tierName] = updatedTier;
      }
      
      logger.info({ tiersCount: Object.keys(tiers).length }, 'All subscription tiers updated successfully');
      return true;
    } catch (error) {
      logger.error({ error, tiers }, 'Failed to update subscription tiers');
      return false;
    }
  }

  /**
   * Reset tiers to default configuration
   */
  resetToDefaults(): void {
    this.tiers = { ...SUBSCRIPTION_TIERS };
    logger.info('Subscription tiers reset to defaults');
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Export a singleton instance
export const subscriptionTiersService = new SubscriptionTiersService();

