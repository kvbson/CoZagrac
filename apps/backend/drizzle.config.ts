// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import './src/env.ts';

export default {
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'camelCase',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
