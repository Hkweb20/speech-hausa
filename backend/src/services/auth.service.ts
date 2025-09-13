import admin from 'firebase-admin';
import { User, IUser } from '../models/User';
import { SUBSCRIPTION_TIERS } from '../config/subscription';
import { logger } from '../config/logger';
import { AuthUser } from '../types/express';

export class AuthService {
  private firebaseApp: admin.app.App;

  constructor() {
    // Initialize Firebase Admin if not already initialized
    if (admin.apps.length === 0) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      this.firebaseApp = admin.app();
    }
  }

  /**
   * Verify Firebase ID token and get user info
   */
  async verifyToken(idToken: string): Promise<AuthUser | null> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Get or create user in our database
      let user = await User.findOne({ id: uid });
      
      if (!user) {
        // Create new user
        user = await this.createUser(uid, decodedToken);
      } else {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        pointsBalance: user.pointsBalance,
        isPremium: user.subscriptionTier !== 'free',
        usageStats: user.usageStats
      };

    } catch (error) {
      logger.error({ error }, 'Error verifying Firebase token');
      return null;
    }
  }

  /**
   * Create new user in database
   */
  private async createUser(uid: string, decodedToken: admin.auth.DecodedIdToken): Promise<IUser | null> {
    try {
      const user = new User({
        id: uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        usageStats: {
          dailyMinutes: 0,
          monthlyMinutes: 0,
          totalMinutes: 0,
          transcriptsCount: 0,
          lastResetDate: new Date()
        },
        pointsBalance: 0,
        pointsHistory: [],
        preferences: {
          language: 'ha-NG',
          theme: 'light',
          autoPunctuation: true,
          cloudSync: false
        },
        adWatchHistory: []
      });

      await user.save();
      logger.info({ userId: uid, email: decodedToken.email }, 'New user created');
      
      return user;

    } catch (error) {
      logger.error({ error, uid }, 'Error creating user');
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const user = await User.findOne({ id: userId });
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        pointsBalance: user.pointsBalance,
        isPremium: user.subscriptionTier !== 'free',
        usageStats: user.usageStats
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error getting user profile');
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string, 
    updates: {
      name?: string;
      preferences?: {
        language?: string;
        theme?: string;
        autoPunctuation?: boolean;
        cloudSync?: boolean;
      };
    }
  ): Promise<AuthUser | null> {
    try {
      const user = await User.findOne({ id: userId });
      if (!user) {
        return null;
      }

      if (updates.name) {
        user.name = updates.name;
      }

      if (updates.preferences) {
        user.preferences = {
          ...user.preferences,
          ...updates.preferences
        } as any;
      }

      await user.save();

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        pointsBalance: user.pointsBalance,
        isPremium: user.subscriptionTier !== 'free',
        usageStats: user.usageStats
      };

    } catch (error) {
      logger.error({ error, userId, updates }, 'Error updating user profile');
      return null;
    }
  }

  /**
   * Upgrade user subscription
   */
  async upgradeSubscription(
    userId: string, 
    newTier: 'basic' | 'gold' | 'premium',
    paymentMethod?: {
      type: string;
      last4?: string;
      brand?: string;
    }
  ): Promise<{ success: boolean; user?: AuthUser; reason?: string }> {
    try {
      const user = await User.findOne({ id: userId });
      if (!user) {
        return {
          success: false,
          reason: 'User not found'
        };
      }

      const tier = SUBSCRIPTION_TIERS[newTier];
      
      // Update user subscription
      user.subscriptionTier = newTier;
      user.subscriptionStatus = 'active';
      user.subscriptionExpiresAt = new Date();
      user.subscriptionExpiresAt.setMonth(user.subscriptionExpiresAt.getMonth() + 1);

      // Reset usage stats for new billing cycle
      user.usageStats.dailyMinutes = 0;
      user.usageStats.monthlyMinutes = 0;
      user.usageStats.lastResetDate = new Date();

      // Enable cloud sync for paid tiers
      if (['basic', 'gold', 'premium'].includes(newTier)) {
        user.preferences.cloudSync = true;
      }

      await user.save();

      logger.info({ 
        userId, 
        newTier, 
        price: tier.price 
      }, 'User subscription upgraded');

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          pointsBalance: user.pointsBalance,
          isPremium: user.subscriptionTier !== 'free',
          usageStats: user.usageStats
        }
      };

    } catch (error) {
      logger.error({ error, userId, newTier }, 'Error upgrading subscription');
      return {
        success: false,
        reason: 'Error upgrading subscription'
      };
    }
  }

  /**
   * Cancel user subscription
   */
  async cancelSubscription(userId: string): Promise<{ success: boolean; reason?: string }> {
    try {
      const user = await User.findOne({ id: userId });
      if (!user) {
        return {
          success: false,
          reason: 'User not found'
        };
      }

      // Downgrade to free tier
      user.subscriptionTier = 'free';
      user.subscriptionStatus = 'cancelled';
      user.subscriptionExpiresAt = undefined;
      user.preferences.cloudSync = false;

      await user.save();

      logger.info({ userId }, 'User subscription cancelled');

      return {
        success: true
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error cancelling subscription');
      return {
        success: false,
        reason: 'Error cancelling subscription'
      };
    }
  }

  /**
   * Get subscription tiers for display
   */
  getSubscriptionTiers() {
    return Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => ({
      id: key,
      name: tier.name,
      price: tier.price,
      currency: tier.currency,
      billingCycle: tier.billingCycle,
      features: tier.features,
      limits: tier.limits,
      description: tier.description
    }));
  }
}
