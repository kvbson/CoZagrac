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

/* =========================
   RECOMMENDATIONS
========================= */

export const getUserRecommendationsHttpSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.coerce.number().optional(),
  }),
});

export type GetUserRecommendationsQuery = z.infer<typeof getUserRecommendationsHttpSchema>['query'];

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

export type GenerateUserEmbeddingResponse = {
  gamesUsed: number;
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
