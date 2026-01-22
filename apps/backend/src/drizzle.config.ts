import '@api/env.js';
import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: './drizzle/schema.ts',
  out: './drizzle',
  casing: 'camelCase',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
