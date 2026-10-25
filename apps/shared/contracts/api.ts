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

/** GET /user/me - session check; steamLinked drives the profile-source wizard */
export type MeResponse = {
  userId: string;
  steamLinked: boolean;
};

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

/* =========================
   RECOMMENDATIONS
========================= */

export const queryBooleanSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

/**
 * review_tier is a popularity tier from getReviewTier():
 * 'S' >= 10k reviews, 'A' >= 5k, 'B' >= 1k. minReviewTier keeps games with
 * at least that many reviews.
 */
export const reviewTierSchema = z.enum(['B', 'A', 'S']);

export const getUserRecommendationsHttpSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.coerce.number().optional(),
    isFree: queryBooleanSchema.optional(),
    minDiscount: z.coerce.number().int().min(1).max(99).optional(),
    minReviewTier: reviewTierSchema.optional(),
    yearFrom: z.coerce.number().int().min(1990).max(2100).optional(),
    platform: z.enum(['windows', 'mac', 'linux']).optional(),
  }),
});

export type GetUserRecommendationsQuery = z.infer<typeof getUserRecommendationsHttpSchema>['query'];

/** same fields as the query schema, without defaults/coercion internals - filters passed from UI */
export type RecommendationFilters = {
  isFree?: boolean;
  minDiscount?: number;
  minReviewTier?: z.infer<typeof reviewTierSchema>;
  yearFrom?: number;
  platform?: 'windows' | 'mac' | 'linux';
};

export const recommendationItemSchema = z.object({
  steamAppid: z.number(),
  name: z.string(),
  similarity: z.number(),
  headerImage: z.string().nullable(),
  isFree: z.boolean().nullable(),
  priceFinalFormatted: z.string().nullable(),
  priceDiscountPercent: z.number().nullable(),
  reviewTier: z.string().nullable(),
});

export type RecommendationItem = z.infer<typeof recommendationItemSchema>;

export type UserRecommendationsResponse = {
  items: RecommendationItem[];
  /** null gdy brak kolejnej strony; przekazaj jako ?cursor= przy następnym wywołaniu */
  nextCursor: number | null;
  /** false gdy użytkownik nie ma jeszcze profilu (embeddingu) */
  hasEmbedding: boolean;
};

/* =========================
   PROFILE SOURCE & FAVORITE GAMES
   The user picks what recommendations are built from: their Steam library
   (top games by playtime) or a manually selected set of favorite games.
   The manual set is persisted in user_favorite_games and is also excluded
   from recommendation results (the user already knows those games).
========================= */

export const profileSourceSchema = z.enum(['steam-library', 'manual-games']);
export type ProfileSource = z.infer<typeof profileSourceSchema>;

export const MIN_FAVORITE_GAMES = 5;
export const MAX_FAVORITE_GAMES = 50;

export const buildUserEmbeddingHttpSchema = z.object({
  body: z.object({
    source: profileSourceSchema,
  }),
});

export type BuildUserEmbeddingBody = z.infer<typeof buildUserEmbeddingHttpSchema>['body'];

export const setUserFavoritesHttpSchema = z.object({
  body: z.object({
    appIds: z
      .array(z.number().int().positive())
      .min(MIN_FAVORITE_GAMES)
      .max(MAX_FAVORITE_GAMES)
      .transform((ids) => [...new Set(ids)]),
  }),
});

export type SetUserFavoritesBody = z.infer<typeof setUserFavoritesHttpSchema>['body'];

export type UserFavoriteGame = {
  steamAppid: number;
  name: string;
  headerImage: string | null;
};

export type UserFavoritesResponse = {
  items: UserFavoriteGame[];
};

/**
 * POST /user/me/embedding is asynchronous now: it starts a job and returns
 * 202 with status 'running'; poll GET /user/me/embedding/status until
 * 'done' (gamesUsed set) or 'failed' (message set). 'idle' = no job since
 * server start (in-memory job store).
 */
export type UserEmbeddingStatusResponse = {
  status: 'idle' | 'running' | 'done' | 'failed';
  gamesUsed?: number;
  message?: string;
  /** source the finished profile was built from (set when status === 'done') */
  source?: ProfileSource;
};

/* =========================
   GAME DETAILS / SIMILAR / REVIEWS
========================= */

export type SimilarGamesResponse = {
  items: RecommendationItem[];
};

/** odpowiedź GET /api/game?appId= - używane pola z game_info + relacje */
export type GameDetailsResponse = {
  steamAppid: number;
  name: string;
  shortDescription: string | null;
  aboutTheGame: string | null;
  releaseDate: string | null;
  releaseComingSoon: boolean | null;
  isFree: boolean | null;
  requiredAge: number | null;
  platformWindows: boolean | null;
  platformMac: boolean | null;
  platformLinux: boolean | null;
  headerImage: string | null;
  capsuleImage: string | null;
  website: string | null;
  appUrl: string | null;
  priceCurrency: string | null;
  priceFinalFormatted: string | null;
  priceInitialFormatted: string | null;
  priceDiscountPercent: number | null;
  reviewTier: string | null;
  pcMinimum: string | null;
  pcRecommended: string | null;
  macMinimum: string | null;
  macRecommended: string | null;
  linuxMinimum: string | null;
  linuxRecommended: string | null;
  genres: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  publishers: { publisherId: number; name: string | null }[];
  movies: { movieId: number; name: string | null; thumbnail: string | null; url: string | null }[];
  screenshots: {
    screenshotId: number;
    pathThumbnail: string | null;
    pathFull: string | null;
  }[];
};

export type GameReviewsSort = 'newest' | 'highestRating' | 'popularity';

/** jeden element GET /api/reviews/:steamAppid (anonymizowane - bez autorów) */
export type GameReviewItem = {
  steamAppid: number;
  recommendationId: number;
  review: string | null;
  votedUp: boolean | null;
  votesUp: number | null;
  votesFunny: number | null;
  weightedVoteScore: number | null;
  playtimeForever: number;
  steamPurchase: boolean | null;
  commentCount: number | null;
  reviewCreated: string | null;
  language: string | null;
};

export type GameReviewsResponse = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: GameReviewItem[];
};

/** language filter for reviews; 'all' disables filtering (values match game_reviews.language) */
export const gameReviewsLanguageSchema = z.enum(['all', 'english', 'polish']);
export type GameReviewsLanguage = z.infer<typeof gameReviewsLanguageSchema>;

/* =========================
   GAME SEARCH (full text)
========================= */

export const getGameSearchHttpSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export type GetGameSearchQuery = z.infer<typeof getGameSearchHttpSchema>['query'];

export type GameSearchItem = {
  steamAppid: number;
  name: string;
  headerImage: string | null;
  isFree: boolean | null;
  priceFinalFormatted: string | null;
  priceDiscountPercent: number | null;
  reviewTier: string | null;
};

export type GameSearchResponse = {
  items: GameSearchItem[];
};

/* =========================
   USER STEAM LIBRARY
========================= */

export type UserLibraryGame = {
  steamAppid: number;
  name: string;
  playtimeForever: number;
  /** null when the game is not in our catalog */
  headerImage: string | null;
};

export type UserLibraryResponse = {
  /** false when the account has no linked Steam profile */
  steamLinked: boolean;
  items: UserLibraryGame[];
};
