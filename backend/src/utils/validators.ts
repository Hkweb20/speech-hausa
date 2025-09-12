import { z } from 'zod';

export const joinSessionSchema = z.object({
  sessionId: z.string().min(1).optional(),
  mode: z.enum(['online', 'offline']).default('online'),
});

export const audioChunkSchema = z.object({
  sessionId: z.string().min(1),
  chunk: z.union([z.string().min(1), z.instanceof(Buffer)]),
  isFinal: z.boolean().optional(),
});

export const endSessionSchema = z.object({
  sessionId: z.string().min(1),
});


