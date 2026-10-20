import { createSelectSchema } from 'drizzle-zod';
import { users } from '../drizzle/schema.js';

// Schematy inputów (create/update/get/delete, provider) przeniesione do
// @cozagrac/shared/contracts/api — walidowane współdzielonym Zod po obu stronach.

/* do odpowiedzi (bez passwordHash) */
export const publicUserSchema = createSelectSchema(users).omit({
  passwordHash: true,
});
