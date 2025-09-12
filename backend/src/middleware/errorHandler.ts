import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const code = err instanceof Error && (err as any).code ? (err as any).code : 'INTERNAL_ERROR';
  const requestId: string | undefined = req.requestId;
  const status = (err as any).status || 500;
  res.status(status).json({ requestId, message, code });
}

