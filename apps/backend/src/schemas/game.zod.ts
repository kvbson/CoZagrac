import { gameInfo } from '@api/drizzle/schema.js';
import { createInsertSchema } from 'drizzle-zod';
import z from 'zod';

const insertGameSchema = createInsertSchema(gameInfo).refine((data) => data.steamAppid, {
  error: 'App id is required',
});

const genresSchema = z.array(z.uuid()).default([]);

const categoriesSchema = z.array(z.uuid()).default([]);

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

export type CreateGameInput = z.infer<typeof createGameHttpSchema>['body'];
