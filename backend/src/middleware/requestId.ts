import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const existing = req.header('x-request-id');
  const id = existing && existing.length > 0 ? existing : randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}

