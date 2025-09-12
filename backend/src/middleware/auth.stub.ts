import { Request, Response, NextFunction } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
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
}

export function authStub(req: Request, _res: Response, next: NextFunction) {
  const headerVal = req.header('x-user-premium');
  const isPremium = headerVal ? headerVal.toLowerCase() === 'true' : false;
  req.user = {
    id: 'stub-user-id',
    email: 'stub@example.com',
    isPremium,
  };
  next();
}

