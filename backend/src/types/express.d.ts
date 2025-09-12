declare namespace Express {
  interface UserStub {
    id: string;
    email: string;
    isPremium: boolean;
  }

  interface Request {
    user?: UserStub;
    requestId?: string;
  }
}


