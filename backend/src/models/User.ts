import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  subscriptionTier: 'free' | 'basic' | 'gold' | 'premium';
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'trial';
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  lastLogin: Date;
  usageStats: {
    dailyMinutes: number;
    monthlyMinutes: number;
    totalMinutes: number;
    transcriptsCount: number;
    lastResetDate: Date;
  };
  pointsBalance: number;
  pointsHistory: Array<{
    type: 'earned' | 'spent';
    amount: number;
    source: 'ad_watch' | 'purchase' | 'summary' | 'punctuation' | 'translation' | 'expiry';
    description: string;
    timestamp: Date;
    expiresAt?: Date;
  }>;
  preferences: {
    language: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar';
    theme: 'light' | 'dark';
    autoPunctuation: boolean;
    cloudSync: boolean;
  };
  adWatchHistory: Array<{
    adId: string;
    pointsEarned: number;
    timestamp: Date;
    verified: boolean;
  }>;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'basic', 'gold', 'premium'], 
    default: 'free' 
  },
  subscriptionStatus: { 
    type: String, 
    enum: ['active', 'cancelled', 'expired', 'trial'], 
    default: 'active' 
  },
  subscriptionExpiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  usageStats: {
    dailyMinutes: { type: Number, default: 0 },
    monthlyMinutes: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    transcriptsCount: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },
  pointsBalance: { type: Number, default: 0 },
  pointsHistory: [{
    type: { type: String, enum: ['earned', 'spent'], required: true },
    amount: { type: Number, required: true },
    source: { 
      type: String, 
      enum: ['ad_watch', 'purchase', 'summary', 'punctuation', 'translation', 'expiry'],
      required: true 
    },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }],
  preferences: {
    language: { type: String, enum: ['ha-NG', 'en-US', 'fr-FR', 'ar'], default: 'ha-NG' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    autoPunctuation: { type: Boolean, default: true },
    cloudSync: { type: Boolean, default: false }
  },
  adWatchHistory: [{
    adId: { type: String, required: true },
    pointsEarned: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false }
  }]
});

export const User = mongoose.model<IUser>('User', UserSchema);
