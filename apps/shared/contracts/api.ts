import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from './consts.js';

/* =========================
   CREATE USER
========================= */

export const createUserHttpSchema = z.object({
  body: z.object({
    email: z.email().nullable(),
    password: z.string().min(MIN_PASSWORD_LENGTH).nullable(),
  }),
});

export type CreateUserInput = z.infer<typeof createUserHttpSchema>['body'];
export type CreateUserInputWithHash = Omit<CreateUserInput, 'password'> & {
  passwordHash: string | null;
};

/* =========================
   LOGIN
========================= */

export const loginUserHttpSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string(),
  }),
});

export type LoginUserInput = z.infer<typeof loginUserHttpSchema>['body'];

/* =========================
   UPDATE USER
========================= */

const updateUserBodySchema = z
  .object({
    email: z.email().optional(),
    password: z.string().min(MIN_PASSWORD_LENGTH).optional(),
  })
  .refine((data) => data.email !== undefined || data.password !== undefined, {
    message: 'At least one field must be provided',
  });

export const updateUserHttpSchema = z.object({
  params: z.object({
    userId: z.uuid(),
  }),
  body: updateUserBodySchema,
});

export type UpdateUserParams = z.infer<typeof updateUserHttpSchema>['params'];
export type UpdateUserBody = z.infer<typeof updateUserHttpSchema>['body'];
export type UpdateUserBodyWithHash = Omit<UpdateUserBody, 'password'> & {
  passwordHash?: string;
};

/* =========================
   GET USER
========================= */

export const getUserQuerySchema = z
  .object({
    id: z.uuid().optional(),
    email: z.email().optional(),
    steamId: z.string().optional(),
  })
  .refine((q) => [q.id, q.email, q.steamId].filter(Boolean).length === 1, {
    message: 'Provide exactly one of: id, email, steamId',
  });

export const getUserHttpSchema = z.object({
  query: getUserQuerySchema,
});

export type GetUserQuery = z.infer<typeof getUserQuerySchema>;

/* =========================
   DELETE USER
========================= */

export const deleteUserHttpSchema = z.object({
  params: z.object({
    userId: z.uuid(),
  }),
});

export type DeleteUserParams = z.infer<typeof deleteUserHttpSchema>['params'];

/* =========================
   PROVIDERS
========================= */

export const createProviderHttpSchema = z.object({
  body: z.object({
    provider: z.string(),
    providerUserId: z.string(),
    userId: z.uuid(),
  }),
});

export type CreateProviderInput = z.infer<typeof createProviderHttpSchema>['body'];
