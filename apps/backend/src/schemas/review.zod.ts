import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { gameReviews } from '../drizzle/schema.js';
import { createUserHttpSchema } from './user.zod.js';

// insert
const insertReviewSchema = createInsertSchema(gameReviews).refine((data) => data.steamAppid, {
  error: 'App id is required',
});

export const createReviewHttpSchema = z.object({
  body: insertReviewSchema,
});

export type CreateReviewInput = z.infer<typeof createUserHttpSchema>['body'];

export const getGameReviewsHttpSchema = z.object({
  params: z.object({
    steamAppid: z.coerce.number(),
  }),
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.enum(['newest', 'highestRating', 'popularity']).default('newest'),
  }),
});

export type GetGameReviewsParams = z.infer<typeof getGameReviewsHttpSchema>['params'];

export type GetGameReviewsQuery = z.infer<typeof getGameReviewsHttpSchema>['query'];
