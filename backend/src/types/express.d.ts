export interface AuthUser {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  pointsBalance: number;
  isPremium: boolean; // Add this to make it compatible with UserStub
  usageStats: {
    dailyMinutes: number;
    monthlyMinutes: number;
    totalMinutes: number;
    transcriptsCount: number;
  };
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser | UserStub;
}

declare namespace Express {
  interface UserStub {
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

  interface Request {
    user?: AuthUser | UserStub;
    requestId?: string;
  }
}


