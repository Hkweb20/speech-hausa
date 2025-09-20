"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionTiersService = void 0;
const subscription_1 = require("../config/subscription");
const logger_1 = require("../config/logger");
/**
 * Centralized service for managing subscription tiers
 * This ensures all services get the latest tier data after admin updates
 */
class SubscriptionTiersService {
    constructor() {
        this.tiers = { ...subscription_1.SUBSCRIPTION_TIERS };
        // Force update premium tier to 90 on startup
        this.updateTier('premium', {
            features: {
                dailyFileUploads: 90
            }
        });
    }
    /**
     * Get all subscription tiers
     */
    getTiers() {
        return { ...this.tiers };
    }
    /**
     * Get a specific subscription tier
     */
    getTier(tierName) {
        return this.tiers[tierName] || null;
    }
    /**
     * Update a subscription tier
     */
    updateTier(tierName, updates) {
        // Force restart to clear any cached values
        if (!this.tiers[tierName]) {
            logger_1.logger.warn({ tierName }, 'Attempted to update non-existent tier');
            return false;
        }
        try {
            // Deep merge the updates
            const updatedTier = this.deepMerge(this.tiers[tierName], updates);
            this.tiers[tierName] = updatedTier;
            logger_1.logger.info({ tierName, updates }, 'Subscription tier updated successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, tierName, updates }, 'Failed to update subscription tier');
            return false;
        }
    }
    /**
     * Update multiple subscription tiers
     */
    updateAllTiers(tiers) {
        try {
            for (const [tierName, updates] of Object.entries(tiers)) {
                if (!this.tiers[tierName]) {
                    logger_1.logger.warn({ tierName }, 'Attempted to update non-existent tier');
                    continue;
                }
                const updatedTier = this.deepMerge(this.tiers[tierName], updates);
                this.tiers[tierName] = updatedTier;
            }
            logger_1.logger.info({ tiersCount: Object.keys(tiers).length }, 'All subscription tiers updated successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, tiers }, 'Failed to update subscription tiers');
            return false;
        }
    }
    /**
     * Reset tiers to default configuration
     */
    resetToDefaults() {
        this.tiers = { ...subscription_1.SUBSCRIPTION_TIERS };
        logger_1.logger.info('Subscription tiers reset to defaults');
    }
    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
}
// Export a singleton instance
exports.subscriptionTiersService = new SubscriptionTiersService();
