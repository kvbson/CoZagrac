import dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
});

export default {
  schema: path.resolve('./src/drizzle/schema.ts'),
  out: path.resolve('./src/drizzle'),
  dialect: 'postgresql',
  casing: 'camelCase',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
