import { users } from '@api/drizzle/schema.js';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// insert
const insertUserSchema = createInsertSchema(users);

export const createUserHttpSchema = z.object({
  body: insertUserSchema
    .pick({
      steamId: true,
      email: true,
      passwordHash: true,
    })
    .refine((data) => data.email || data.passwordHash, {
      error: 'Password and email are required.',
    }),
});

export type CreateUserInput = z.infer<typeof createUserHttpSchema>['body'];

// update
const updateUserBodySchema = createInsertSchema(users)
  .partial()
  .pick({
    steamId: true,
    email: true,
    passwordHash: true,
  })
  .refine((data) => data.email || data.passwordHash || data.steamId, {
    error: 'At least one info must be passed to update',
  });

export const updateUserHttpSchema = z.object({
  params: z.object({
    userId: z.uuid(),
  }),
  body: updateUserBodySchema,
});

export type UpdateUserParams = z.infer<typeof updateUserHttpSchema>['params'];

export type UpdateUserBody = z.infer<typeof updateUserHttpSchema>['body'];

// get
export const getUserQueryHttpSchema = z
  .object({
    id: z.uuid().optional(),
    email: z.email().optional(),
    steamId: z.string().optional(),
  })
  .refine((q) => [q.id, q.email, q.steamId].filter(Boolean).length === 1, {
    error: 'Provide exactly one of: id, email, steamId',
  });

export type GetUserQuery = z.infer<typeof getUserQueryHttpSchema>;

// delete
export const deleteUserHttpSchema = z
  .object({
    params: z.object({
      id: z.uuid(),
    }),
  })
  .refine((data) => data.params.id, { error: 'User id is required for deleting.' });

export type DeleteUserParams = z.infer<typeof deleteUserHttpSchema>['params'];

/* do odpowiedzi (bez passwordHash) */
export const publicUserSchema = createSelectSchema(users).omit({
  passwordHash: true,
});
