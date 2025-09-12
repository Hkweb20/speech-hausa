import { Request, Response, NextFunction } from 'express';

export function premiumGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isPremium) {
    return res.status(402).json({ message: 'Premium required' });
  }
  return next();
}

