import { Request, Response } from 'express';
import { version } from '../../package.json';

export function getHealth(_req: Request, res: Response) {
  res.json({ status: 'ok', version });
}

