import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { SUBSCRIPTION_TIERS } from '../config/subscription';
import { logger } from '../config/logger';
import { env } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  pointsBalance: number;
  isPremium: boolean;
  usageStats: {
    dailyMinutes: number;
    monthlyMinutes: number;
    totalMinutes: number;
    transcriptsCount: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  preferences?: {
    language?: string;
    theme?: 'light' | 'dark';
    autoPunctuation?: boolean;
    cloudSync?: boolean;
  };
}

export class MongoDBAuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Create new user
      const newUser = new User({
        email: data.email,
        password: hashedPassword,
        name: data.name,
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
          language: data.preferences?.language || 'ha-NG',
          theme: data.preferences?.theme || 'light',
          autoPunctuation: data.preferences?.autoPunctuation ?? true,
          cloudSync: data.preferences?.cloudSync ?? false
        },
        adWatchHistory: []
      });

      await newUser.save();

      // Generate JWT token
      const token = this.generateToken(newUser);

      // Convert to AuthUser format
      const authUser = this.convertToAuthUser(newUser);

      logger.info({ userId: newUser._id, email: newUser.email }, 'User registered successfully');

      return {
        success: true,
        user: authUser,
        token
      };

    } catch (error) {
      logger.error({ error, email: data.email }, 'Error during user registration');
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Login user with email and password
   */
  async login(data: LoginRequest): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
    try {
      // Find user by email
      const user = await User.findOne({ email: data.email });
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      // Convert to AuthUser format
      const authUser = this.convertToAuthUser(user);

      logger.info({ userId: user._id, email: user.email }, 'User logged in successfully');

      return {
        success: true,
        user: authUser,
        token
      };

    } catch (error) {
      logger.error({ error, email: data.email }, 'Error during user login');
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return null;
      }

      return this.convertToAuthUser(user);

    } catch (error) {
      logger.error({ error }, 'Error verifying token');
      return null;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      return this.convertToAuthUser(user);

    } catch (error) {
      logger.error({ error, userId }, 'Error getting user profile');
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: {
    name?: string;
    preferences?: {
      language?: string;
      theme?: 'light' | 'dark';
      autoPunctuation?: boolean;
      cloudSync?: boolean;
    };
  }): Promise<AuthUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      // Update fields
      if (updates.name) {
        user.name = updates.name;
      }

      if (updates.preferences) {
        if (updates.preferences.language) {
          user.preferences.language = updates.preferences.language as any;
        }
        if (updates.preferences.theme) {
          user.preferences.theme = updates.preferences.theme;
        }
        if (updates.preferences.autoPunctuation !== undefined) {
          user.preferences.autoPunctuation = updates.preferences.autoPunctuation;
        }
        if (updates.preferences.cloudSync !== undefined) {
          user.preferences.cloudSync = updates.preferences.cloudSync;
        }
      }

      await user.save();

      return this.convertToAuthUser(user);

    } catch (error) {
      logger.error({ error, userId }, 'Error updating user profile');
      return null;
    }
  }

  /**
   * Get subscription tiers
   */
  getSubscriptionTiers() {
    return SUBSCRIPTION_TIERS;
  }

  /**
   * Upgrade user subscription
   */
  async upgradeSubscription(userId: string, tier: string, paymentMethod?: any): Promise<{
    success: boolean;
    user?: AuthUser;
    reason?: string;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          reason: 'User not found'
        };
      }

      // Validate tier
      if (!['basic', 'gold', 'premium'].includes(tier)) {
        return {
          success: false,
          reason: 'Invalid subscription tier'
        };
      }

      // Update subscription
      user.subscriptionTier = tier as any;
      user.subscriptionStatus = 'active';
      user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await user.save();

      logger.info({ userId, tier }, 'User subscription upgraded');

      return {
        success: true,
        user: this.convertToAuthUser(user)
      };

    } catch (error) {
      logger.error({ error, userId, tier }, 'Error upgrading subscription');
      return {
        success: false,
        reason: 'Failed to upgrade subscription'
      };
    }
  }

  /**
   * Cancel user subscription
   */
  async cancelSubscription(userId: string): Promise<{
    success: boolean;
    user?: AuthUser;
    reason?: string;
  }> {
    try {
      const user = await User.findById(userId);
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

      await user.save();

      logger.info({ userId }, 'User subscription cancelled');

      return {
        success: true,
        user: this.convertToAuthUser(user)
      };

    } catch (error) {
      logger.error({ error, userId }, 'Error cancelling subscription');
      return {
        success: false,
        reason: 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: IUser): string {
    return jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        subscriptionTier: user.subscriptionTier
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }


  /**
   * Convert IUser to AuthUser
   */
  private convertToAuthUser(user: IUser): AuthUser {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      pointsBalance: user.pointsBalance,
      isPremium: user.subscriptionTier !== 'free',
      usageStats: {
        dailyMinutes: user.usageStats.dailyMinutes,
        monthlyMinutes: user.usageStats.monthlyMinutes,
        totalMinutes: user.usageStats.totalMinutes,
        transcriptsCount: user.usageStats.transcriptsCount
      }
    };
  }
}
