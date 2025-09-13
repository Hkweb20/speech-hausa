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

declare namespace Express {
  interface UserStub {
    id: string;
    email: string;
    isPremium: boolean;
  }

  interface Request {
    user?: AuthUser | UserStub;
    requestId?: string;
  }
}


