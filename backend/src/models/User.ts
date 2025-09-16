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
    dailyAIRequests: number;
    monthlyAIRequests: number;
    totalAIRequests: number;
            // File upload tracking
            dailyFileUploads: number;
            monthlyFileUploads: number;
            totalFileUploads: number;
            // Live recording tracking
            dailyLiveRecordingMinutes: number;
            monthlyLiveRecordingMinutes: number;
            totalLiveRecordingMinutes: number;
            // Real-time streaming tracking
            dailyRealTimeStreamingMinutes: number;
            monthlyRealTimeStreamingMinutes: number;
            totalRealTimeStreamingMinutes: number;
            // Translation tracking
            dailyTranslationMinutes: number;
            monthlyTranslationMinutes: number;
            totalTranslationMinutes: number;
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
  customLimits?: {
    dailyMinutes?: number;
    monthlyMinutes?: number;
    dailyFileUploads?: number;
    maxFileDuration?: number;
    dailyLiveRecordingMinutes?: number;
    dailyRealTimeStreamingMinutes?: number;
    dailyTranslationMinutes?: number;
    dailyAIRequests?: number;
    monthlyAIRequests?: number;
    aiFeatures?: string[];
    exportFormats?: string[];
    cloudSync?: boolean;
    offlineMode?: boolean;
    prioritySupport?: boolean;
    apiAccess?: boolean;
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
    lastResetDate: { type: Date, default: Date.now },
    dailyAIRequests: { type: Number, default: 0 },
    monthlyAIRequests: { type: Number, default: 0 },
    totalAIRequests: { type: Number, default: 0 },
            // File upload tracking
            dailyFileUploads: { type: Number, default: 0 },
            monthlyFileUploads: { type: Number, default: 0 },
            totalFileUploads: { type: Number, default: 0 },
            // Live recording tracking
            dailyLiveRecordingMinutes: { type: Number, default: 0 },
            monthlyLiveRecordingMinutes: { type: Number, default: 0 },
            totalLiveRecordingMinutes: { type: Number, default: 0 },
            // Real-time streaming tracking
            dailyRealTimeStreamingMinutes: { type: Number, default: 0 },
            monthlyRealTimeStreamingMinutes: { type: Number, default: 0 },
            totalRealTimeStreamingMinutes: { type: Number, default: 0 },
            // Translation tracking
            dailyTranslationMinutes: { type: Number, default: 0 },
            monthlyTranslationMinutes: { type: Number, default: 0 },
            totalTranslationMinutes: { type: Number, default: 0 }
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
  }],
  customLimits: {
    dailyMinutes: { type: Number },
    monthlyMinutes: { type: Number },
    dailyFileUploads: { type: Number },
    maxFileDuration: { type: Number },
    dailyLiveRecordingMinutes: { type: Number },
    dailyRealTimeStreamingMinutes: { type: Number },
    dailyTranslationMinutes: { type: Number },
    dailyAIRequests: { type: Number },
    monthlyAIRequests: { type: Number },
    aiFeatures: [{ type: String }],
    exportFormats: [{ type: String }],
    cloudSync: { type: Boolean },
    offlineMode: { type: Boolean },
    prioritySupport: { type: Boolean },
    apiAccess: { type: Boolean }
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);
