import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { userProviders, users } from '../drizzle/schema.js';

// insert
const insertUserSchema = createInsertSchema(users);
const insertProviderSchema = createInsertSchema(userProviders);

// export const createUserHttpSchema = z.object({
//   body: insertUserSchema
//     .pick({
//       email: true,
//       passwordHash: true,
//     })
//     .refine((data) => data.email || data.passwordHash, {
//       error: 'Password and email are required.',
//     }),
// });

// export type CreateUserInput = z.infer<typeof createUserHttpSchema>['body'];

// export const createProviderHttpSchema = z.object({
//   body: insertProviderSchema
//     .pick({
//       provider: true,
//       providerUserId: true,
//       userId: true,
//     })
//     .refine((data) => data.provider || data.providerUserId || data.userId, {
//       error: 'Provider and provider userId are required.',
//     }),
// });

// export type CreateProviderInput = z.infer<typeof createProviderHttpSchema>['body'];

// update
const updateUserBodySchema = insertUserSchema
  .partial()
  .pick({
    email: true,
    passwordHash: true,
  })
  .refine((data) => data.email || data.passwordHash, {
    error: 'At least one info must be passed to update',
  });

// export const updateUserHttpSchema = z.object({
//   params: z.object({
//     userId: z.uuid(),
//   }),
//   body: updateUserBodySchema,
// });

// export type UpdateUserParams = z.infer<typeof updateUserHttpSchema>['params'];

// export type UpdateUserBody = z.infer<typeof updateUserHttpSchema>['body'];

// get
// export const getUserQuerySchema = z
//   .object({
//     id: z.uuid().optional(),
//     email: z.email().optional(),
//     steamId: z.string().optional(),
//   })
//   .refine((q) => [q.id, q.email, q.steamId].filter(Boolean).length === 1, {
//     error: 'Provide exactly one of: id, email, steamId',
//   });

// export const getUserHttpSchema = z.object({
//   query: getUserQuerySchema,
// });

// export type GetUserQuery = z.infer<typeof getUserQuerySchema>;

// delete
// export const deleteUserHttpSchema = z
//   .object({
//     params: z.object({
//       userId: z.uuid(),
//     }),
//   })
//   .refine((data) => data.params.userId, { error: 'User id is required for deleting.' });

// export type DeleteUserParams = z.infer<typeof deleteUserHttpSchema>['params'];

/* do odpowiedzi (bez passwordHash) */
export const publicUserSchema = createSelectSchema(users).omit({
  passwordHash: true,
});
