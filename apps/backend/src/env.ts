import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.string().min(4),
  STEAM_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export const env = (() => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
})();
