import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
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
