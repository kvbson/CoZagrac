import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.string().regex(/^\d+$/).default('3001'),
  STEAM_API_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  FRONTEND_URL: z.string().default('http://localhost:5137'),
  DB_SSL: z.enum(['verify', 'no-verify', 'disable']).optional(),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

// SINGLE SOURCE OF TRUTH for environment values. Modules must NOT read
// process.env at evaluation time: ESM sibling-import order in index.ts is
// controlled by the formatter, so dotenv here may run AFTER the first
// process.env read (this caused DB_SSL/isDev to silently resolve to the
// production defaults). Importing `env` from this file guarantees dotenv is
// evaluated first, because an imported module always runs before the importer.
export const env = (() => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error('Invalid environment variables');
  }

  console.log('[ENV] validated keys:', Object.keys(parsed.data).join(', '));

  return parsed.data;
})();
