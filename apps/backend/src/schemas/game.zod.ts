import { createInsertSchema } from 'drizzle-zod';
import z from 'zod';
import { gameInfo } from '../drizzle/schema.js';

const insertGameSchema = createInsertSchema(gameInfo).refine((data) => data.steamAppid, {
  error: 'App id is required',
});

const steamIdSchema = z.object({
  id: z.string(),
  description: z.string(),
});

const genresSchema = z.array(steamIdSchema).default([]);
const categoriesSchema = z.array(steamIdSchema).default([]);

const publishersSchema = z
  .array(
    z.object({
      publisherId: z.number(),
      name: z.string().optional(),
    }),
  )
  .default([]);

const moviesSchema = z
  .array(
    z.object({
      movieId: z.number(),
      name: z.string().optional(),
      thumbnail: z.string().optional(),
      url: z.string().optional(),
    }),
  )
  .default([]);

const screenshotsSchema = z
  .array(
    z.object({
      screenshotId: z.number(),
      pathThumbnail: z.string().optional(),
      pathFull: z.string().optional(),
    }),
  )
  .default([]);

export const createGameHttpSchema = z.object({
  body: z.object({
    game: insertGameSchema,
    genres: genresSchema,
    categories: categoriesSchema,
    publishers: publishersSchema,
    movies: moviesSchema,
    screenshots: screenshotsSchema,
  }),
});

export const getGameInfoByAppIdHttpSchema = z.object({
  query: z.object({
    appId: z.coerce.number(),
  }),
});

export type GetGameInfoByAppIdQuery = z.infer<typeof getGameInfoByAppIdHttpSchema>['query'];

export const getSimilarGamesHttpSchema = z.object({
  query: z.object({
    appId: z.coerce.number(),
    limit: z.coerce.number().int().min(1).max(24).default(8),
  }),
});

export type GetSimilarGamesQuery = z.infer<typeof getSimilarGamesHttpSchema>['query'];

export type CreateGameInput = z.infer<typeof createGameHttpSchema>['body'];
