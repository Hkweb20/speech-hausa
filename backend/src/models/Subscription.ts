import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  userId: string;
  tier: 'free' | 'basic' | 'gold' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'pending';
  price: number; // in cents
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  autoRenew: boolean;
  paymentMethod?: {
    type: 'card' | 'paypal' | 'apple' | 'google';
    last4?: string;
    brand?: string;
  };
  features: {
    dailyMinutes: number;
    monthlyMinutes: number;
    maxFileSize: number; // in MB
    maxTranscripts: number;
    exportFormats: string[];
    aiFeatures: string[];
    cloudSync: boolean;
    offlineMode: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
  limits: {
    dailyAdWatches: number;
    pointsPerAd: number;
    maxPointsBalance: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: { type: String, required: true, index: true },
  tier: { 
    type: String, 
    enum: ['free', 'basic', 'gold', 'premium'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'cancelled', 'expired', 'trial', 'pending'], 
    default: 'active' 
  },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  billingCycle: { 
    type: String, 
    enum: ['monthly', 'yearly', 'lifetime'], 
    required: true 
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  trialEndDate: { type: Date },
  autoRenew: { type: Boolean, default: true },
  paymentMethod: {
    type: { type: String, enum: ['card', 'paypal', 'apple', 'google'] },
    last4: { type: String },
    brand: { type: String }
  },
  features: {
    dailyMinutes: { type: Number, required: true },
    monthlyMinutes: { type: Number, required: true },
    maxFileSize: { type: Number, required: true },
    maxTranscripts: { type: Number, required: true },
    exportFormats: [{ type: String }],
    aiFeatures: [{ type: String }],
    cloudSync: { type: Boolean, required: true },
    offlineMode: { type: Boolean, required: true },
    prioritySupport: { type: Boolean, required: true },
    apiAccess: { type: Boolean, required: true }
  },
  limits: {
    dailyAdWatches: { type: Number, required: true },
    pointsPerAd: { type: Number, required: true },
    maxPointsBalance: { type: Number, required: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SubscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
