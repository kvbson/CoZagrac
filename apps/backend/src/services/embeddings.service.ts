import { and, desc, eq, gte, inArray, ne, notInArray, sql } from 'drizzle-orm';
import type { ProfileSource, RecommendationFilters } from '@cozagrac/shared/contracts/api';
import { model } from '../clients/openai/index.js';
import { createEmbeddings } from '../clients/openai/embeddings.js';
import { QuotaError } from '../utils/usage.helpers.js';
import { ownedGamesEndpoint } from '../clients/steam/endpoints/userContext/ownedGames.endpoint.js';
import { db } from '../db/init.js';
import { gameEmbeddings, gameInfo, userEmbeddings, userProviders } from '../drizzle/schema.js';
import { favoritesService } from './favorites.service.js';
import {
  chunkReviews,
  l2Normalize,
  meanOrZero,
  toPgVector,
  trimText,
  weightedMean,
} from '../utils/embedding.helpers.js';
import { logger } from '../utils/logger.js';
import { gameService } from './game.service.js';
import { reviewService } from './review.service.js';
import { syncGameInfo } from '../functions/sync/syncGameInfo.js';
import { syncReviewsForGames } from '../functions/sync/syncReviewsForGames.js';

export const LIMITS = {
  MIN_REVIEW_CHARS: 200,
  MAX_REVIEW_CHARS: 2000, // ~500 tokenów
  MAX_POSITIVE_REVIEWS: 50,
  MAX_NEGATIVE_REVIEWS: 30,
  MAX_DESCRIPTION_CHARS: 4000,
};

export const USER_LIMITS = {
  MAX_GAMES_FOR_USER: 50,
  MAX_GENRES: 50,
  MAX_CATEGORIES: 50,
};

export const ACTIVE_EMBEDDING_VERSION = 'v1';

/**
 * minReviewTier -> tiers with at least that many reviews.
 * getReviewTier(): 'S' >= 10k, 'A' >= 5k, 'B' >= 1k Steam reviews.
 */
const REVIEW_TIER_ALLOWED: Record<'B' | 'A' | 'S', string[]> = {
  B: ['S', 'A', 'B'],
  A: ['S', 'A'],
  S: ['S'],
};

const PLATFORM_COLUMNS = {
  windows: gameInfo.platformWindows,
  mac: gameInfo.platformMac,
  linux: gameInfo.platformLinux,
} as const;

/** wspólny kształt wiersza-karty gry (kNN + join game_info) */
type GameCardRow = {
  steamAppid: number;
  name: string | null;
  similarity: number;
  headerImage: string | null;
  isFree: boolean | null;
  priceFinalFormatted: string | null;
  priceDiscountPercent: number | null;
  reviewTier: string | null;
};

function toGameCardItem(r: GameCardRow) {
  return {
    steamAppid: r.steamAppid,
    name: r.name ?? 'Unknown',
    similarity: Number(r.similarity),
    headerImage: r.headerImage ?? null,
    isFree: r.isFree ?? null,
    priceFinalFormatted: r.priceFinalFormatted ?? null,
    priceDiscountPercent: r.priceDiscountPercent ?? null,
    reviewTier: r.reviewTier ?? null,
  };
}

export const embeddingService = {
  game: {
    /**
     * Generate and save new game embedding.
     * ctx.userId = who triggered the generation (manual profile build);
     * null = admin batch script - only the global daily budget applies.
     */
    async generateGameEmbedding(
      steamAppId: number,
      ctx: { userId: string | null } = { userId: null },
    ) {
      const [gameInfo, reviews] = await Promise.all([
        gameService.getByAppId(steamAppId),
        reviewService.getEmbeddingCandidatesForGame(steamAppId),
      ]);

      if (!gameInfo) {
        logger.error(`Game not found: ${steamAppId}`);
        return;
      }
      if (reviews.positive.length === 0 && reviews.negative.length === 0) {
        logger.warn('[GAME_EMBEDDINGS][SKIP]', { steamAppId, reason: 'No reviews available' });
        return;
      }
      /**
       * 1. Prepare review texts
       */
      const positiveTexts = reviews.positive
        .slice(0, LIMITS.MAX_POSITIVE_REVIEWS)
        .map((r) => trimText(r, LIMITS.MAX_REVIEW_CHARS))
        .filter((t): t is string => t.length > 0);

      const negativeTexts = reviews.negative
        .slice(0, LIMITS.MAX_NEGATIVE_REVIEWS)
        .map((r) => trimText(r, LIMITS.MAX_REVIEW_CHARS))
        .filter((t): t is string => t.length > 0);

      /**
       * 2. Prepare description
       */
      const shortDescription = gameInfo.shortDescription
        ? trimText(gameInfo.shortDescription, 300)
        : null;

      const aboutTheGame = gameInfo.aboutTheGame ? trimText(gameInfo.aboutTheGame, 4000) : null;

      if (!shortDescription && !aboutTheGame) {
        logger.warn(`Insufficient description for appId: ${steamAppId}`);
        return;
      }

      const descriptionText = [
        shortDescription && `Summary:\n${shortDescription}`,
        aboutTheGame && `Detailed description:\n${aboutTheGame}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      /**
       * 3. Prepare taxonomy text
       */
      const genres = gameInfo.genres?.map((g) => g.name) ?? [];
      const categories = gameInfo.categories?.map((c) => c.name) ?? [];

      if (!genres.length && !categories.length) {
        logger.warn(`Missing taxonomy for appId: ${steamAppId}`);
        return;
      }

      const taxonomyText = [
        'Game characteristics:',
        genres.length && `- Genres: ${genres.join(', ')}`,
        categories.length && `- Features: ${categories.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n');

      const positiveChunks = chunkReviews(positiveTexts).map(
        (c) => `Player reviews – positive feedback:\n${c}`,
      );

      const negativeChunks = chunkReviews(negativeTexts).map(
        (c) => `Player reviews – negative feedback:\n${c}`,
      );

      logger.debug('[GAME_EMBEDDINGS][INPUT]', {
        steamAppId,
        descriptionLength: descriptionText.length,
        genresCount: genres.length,
        categoriesCount: categories.length,
        positiveReviews: positiveTexts.length,
        negativeReviews: negativeTexts.length,
        positiveChunks: positiveChunks.length,
        negativeChunks: negativeChunks.length,
      });

      /**
       * 4. Generate embeddings
       */
      const [descriptionRes, positiveRes, negativeRes, taxonomyRes] = await Promise.all([
        createEmbeddings(descriptionText, ctx),

        positiveChunks.length ? createEmbeddings(positiveChunks, ctx) : null,

        negativeChunks.length ? createEmbeddings(negativeChunks, ctx) : null,

        createEmbeddings(taxonomyText, ctx),
      ]);

      /**
       * 5. Aggregate review embeddings
       */
      const descriptionVec = descriptionRes.data[0].embedding;
      const taxonomyVec = taxonomyRes.data[0].embedding;

      const dim = descriptionVec.length;

      const positiveVec = positiveRes
        ? meanOrZero(
            positiveRes.data.map((d) => d.embedding),
            dim,
          )
        : null;

      const negativeVec = negativeRes
        ? meanOrZero(
            negativeRes.data.map((d) => d.embedding),
            dim,
          )
        : null;

      /**
       * 6. Dynamic weights (description length + review coverage)
       */
      const descLen = descriptionText.length;
      const DESC_MIN = 800;
      const DESC_MAX = 3000;

      const descQuality = Math.min(1, Math.max(0, (descLen - DESC_MIN) / (DESC_MAX - DESC_MIN)));

      const descriptionWeight = 0.4 + 0.1 * descQuality;
      const taxonomyWeight = 0.15;

      const reviewBaseWeight = 1 - descriptionWeight - taxonomyWeight;

      const positiveWeight = positiveVec ? reviewBaseWeight * 0.7 : 0;

      const negativeCoverage = negativeTexts.length / LIMITS.MAX_NEGATIVE_REVIEWS;
      const negativeWeight = negativeVec ? -0.05 * negativeCoverage : 0;

      logger.debug('[GAME_EMBEDDINGS][WEIGHTS]', {
        steamAppId,
        descLength: descLen,
        descQuality: Number(descQuality.toFixed(3)),
        descriptionWeight: Number(descriptionWeight.toFixed(3)),
        taxonomyWeight,
        reviewBaseWeight: Number(reviewBaseWeight.toFixed(3)),
        positiveWeight: Number(positiveWeight.toFixed(3)),
        negativeWeight: Number(negativeWeight.toFixed(3)),
        negativeCoverage: Number(negativeCoverage.toFixed(3)),
      });

      /**
       * 7. Final composition
       */
      const finalEmbedding = l2Normalize(
        weightedMean(
          [
            { vec: descriptionVec, weight: descriptionWeight },
            positiveVec && { vec: positiveVec, weight: positiveWeight },
            negativeVec && { vec: negativeVec, weight: negativeWeight },
            { vec: taxonomyVec, weight: taxonomyWeight },
          ].filter(Boolean) as { vec: number[]; weight: number }[],
        ),
      );
      logger.debug('[GAME_EMBEDDINGS][VECTOR]', {
        steamAppId,
        dimension: finalEmbedding.length,
        normApprox: Math.sqrt(finalEmbedding.reduce((a, v) => a + v * v, 0)).toFixed(4),
      });

      /**
       * 8. Persist
       */
      await db.transaction(async (tx) => {
        await tx.delete(gameEmbeddings).where(eq(gameEmbeddings.steamAppid, steamAppId));
        await tx.insert(gameEmbeddings).values({
          steamAppid: steamAppId,
          embedding: finalEmbedding,
          modelName: model,
          embeddingVersion: ACTIVE_EMBEDDING_VERSION,
        });
      });
      logger.info('[GAME_EMBEDDINGS][SUMMARY]', {
        steamAppId,
        descriptionWeight: Number(descriptionWeight.toFixed(2)),
        positiveWeight: Number(positiveWeight.toFixed(2)),
        negativeWeight: Number(negativeWeight.toFixed(2)),
        taxonomyWeight,
        reviews: `${positiveTexts.length}/${negativeTexts.length}`,
      });
      logger.checkpoint(steamAppId);
      return finalEmbedding;
    },

    /**
     * Find games with the closest embeddings to a given game (with card data).
     */
    async findSimilarToGame(steamAppid: number, limit = 8) {
      const [source] = await db
        .select({ embedding: gameEmbeddings.embedding })
        .from(gameEmbeddings)
        .where(
          and(
            eq(gameEmbeddings.steamAppid, steamAppid),
            eq(gameEmbeddings.embeddingVersion, ACTIVE_EMBEDDING_VERSION),
          ),
        )
        .orderBy(desc(gameEmbeddings.createdAt))
        .limit(1);

      if (!source) return [];

      const safeLimit = Math.min(limit, 24);

      // binding tablicy JS w surowym sql da serializację {1,2,3} (błędną dla pgvector) -
      // dlatego jawnie do formatu wektora
      const similarityExpr = sql<number>`
    1 - (${gameEmbeddings.embedding} <=> ${toPgVector(source.embedding)}::vector)
  `;

      const rows = await db
        .select({
          steamAppid: gameEmbeddings.steamAppid,
          name: gameInfo.name,
          similarity: similarityExpr,
          headerImage: gameInfo.headerImage,
          isFree: gameInfo.isFree,
          priceFinalFormatted: gameInfo.priceFinalFormatted,
          priceDiscountPercent: gameInfo.priceDiscountPercent,
          reviewTier: gameInfo.reviewTier,
        })
        .from(gameEmbeddings)
        .innerJoin(gameInfo, eq(gameInfo.steamAppid, gameEmbeddings.steamAppid))
        .where(
          and(
            eq(gameEmbeddings.embeddingVersion, ACTIVE_EMBEDDING_VERSION),
            ne(gameEmbeddings.steamAppid, steamAppid),
          ),
        )
        .orderBy(desc(similarityExpr))
        .limit(safeLimit);

      return rows.map(toGameCardItem);
    },
  },

  user: {
    /**
     * Build the user profile embedding from the basis picked in the
     * source wizard. Both sources produce the same 'v2-centroid' math
     * (unweighted mean of game embeddings); only the input set differs.
     */
    async generateUserEmbedding(userId: string, source: ProfileSource) {
      if (source === 'manual-games') {
        return embeddingService.user.generateFromFavoriteGames(userId);
      }
      return embeddingService.user.generateFromSteamLibrary(userId);
    },

    /**
     * Generate and save user embeddings
     */
    async generateFromSteamLibrary(userId: string) {
      const [provider] = await db
        .select({ steamId: userProviders.providerUserId })
        .from(userProviders)
        .where(eq(userProviders.userId, userId))
        .limit(1);

      const steamId = provider?.steamId;
      if (!steamId) {
        logger.error('[USER_EMBEDDING] Missing steamId');
        return null;
      }

      const { response } = await ownedGamesEndpoint.getData(steamId);
      const ownedGames = response?.games ?? [];

      if (!ownedGames.length) {
        logger.warn('[USER_EMBEDDING] No owned games');
        return null;
      }

      const topGames = [...ownedGames]
        .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
        .slice(0, USER_LIMITS.MAX_GAMES_FOR_USER);
      const gameInfos = await Promise.all(topGames.map((g) => gameService.getByAppId(g.appid)));
      const missingInfos: typeof topGames = [];

      for (const [index, info] of gameInfos.entries()) {
        const game = topGames[index];
        if (!game.appid) {
          logger.warn(`[USER_EMBEDDING] Owned game missing appid - skipping`, { game });
          continue;
        }
        if (!info) {
          missingInfos.push(game);
        }
      }

      if (missingInfos.length > 0) {
        // TODO: jeśli gra nie ma opisu, można pobrać go z Steam i wygenerować embedding na bieżąco
        for (const { appid } of missingInfos) {
          const syncResult = await syncGameInfo(appid);
          if (!syncResult.success) {
            logger.warn(
              `[USER_EMBEDDING] Failed to sync game info for appId ${appid} - ${syncResult.reason}`,
            );
            continue;
          }
        }

        await syncReviewsForGames({ specificAppIds: missingInfos.map((g) => g.appid) });

        logger.warn(
          `[USER_EMBEDDING] Missing game info for ${missingInfos.length} owned games – they will be skipped.`,
        );
      }

      const gameEmbRows = await db
        .select({
          embedding: gameEmbeddings.embedding,
          steamAppid: gameEmbeddings.steamAppid,
        })
        .from(gameEmbeddings)
        .where(
          inArray(
            gameEmbeddings.steamAppid,
            topGames.map((g) => g.appid),
          ),
        );

      if (!gameEmbRows.length) {
        logger.warn('[USER_EMBEDDING] No game embeddings found');
        return null;
      }

      const vectors = gameEmbRows.map((r) => ({
        vec: r.embedding,
        weight: 1,
      }));

      const finalEmbedding = l2Normalize(weightedMean(vectors));

      await db.transaction(async (tx) => {
        await tx.delete(userEmbeddings).where(eq(userEmbeddings.userId, userId));

        await tx.insert(userEmbeddings).values({
          userId,
          embedding: finalEmbedding,
          modelName: model,
          embeddingVersion: 'v2-centroid',
        });
      });

      logger.info('[USER_EMBEDDING][V2]', {
        userId,
        basedOnGames: gameEmbRows.length,
      });

      return { embedding: finalEmbedding, gamesUsed: gameEmbRows.length };
    },

    /**
     * Profile from the user's manually picked favorite games
     * (user_favorite_games). Games missing from the catalog or without an
     * embedding yet are synced on the fly, so fresh long-tail picks still
     * build a usable profile inside the async job.
     */
    async generateFromFavoriteGames(userId: string) {
      const appIds = await favoritesService.getAppIds(userId);
      if (!appIds.length) {
        logger.warn('[USER_EMBEDDING] No favorite games selected');
        return null;
      }

      const selectGameEmbeddings = (ids: number[]) =>
        db
          .select({ embedding: gameEmbeddings.embedding, steamAppid: gameEmbeddings.steamAppid })
          .from(gameEmbeddings)
          .where(inArray(gameEmbeddings.steamAppid, ids));

      let rows = await selectGameEmbeddings(appIds);
      const missing = appIds.filter((appid) => !rows.some((r) => r.steamAppid === appid));
      let quotaReached = false;

      if (missing.length) {
        logger.info(`[USER_EMBEDDING] ${missing.length} favorite games lack embeddings - syncing`);

        for (const appid of missing) {
          const syncResult = await syncGameInfo(appid);
          if (!syncResult.success) {
            logger.warn(
              `[USER_EMBEDDING] Failed to sync game info for appId ${appid} - ${syncResult.reason}`,
            );
          }
        }

        await syncReviewsForGames({ specificAppIds: missing });

        for (const appid of missing) {
          try {
            await embeddingService.game.generateGameEmbedding(appid, { userId });
          } catch (err) {
            if (err instanceof QuotaError) {
              logger.warn(`[USER_EMBEDDING] Daily AI quota hit at appId ${appid} - stopping`);
              quotaReached = true;
              break;
            }
            throw err;
          }
        }

        rows = await selectGameEmbeddings(appIds);
      }

      if (!rows.length) {
        logger.warn('[USER_EMBEDDING] No game embeddings found for favorite games');
        return quotaReached ? { gamesUsed: 0, quotaReached: true } : null;
      }

      const vectors = rows.map((r) => ({ vec: r.embedding, weight: 1 }));
      const finalEmbedding = l2Normalize(weightedMean(vectors));

      await db.transaction(async (tx) => {
        await tx.delete(userEmbeddings).where(eq(userEmbeddings.userId, userId));

        await tx.insert(userEmbeddings).values({
          userId,
          embedding: finalEmbedding,
          modelName: model,
          embeddingVersion: 'v2-centroid',
        });
      });

      logger.info('[USER_EMBEDDING][V2][FAVORITES]', {
        userId,
        basedOnGames: rows.length,
        quotaReached,
      });

      return { embedding: finalEmbedding, gamesUsed: rows.length, quotaReached };
    },

    /**
     * Recommend games for a user (kNN against game embeddings).
     * - excludes games already owned (Steam library),
     * - only active game-embedding version,
     * - cursor = similarity of the last returned item; next batch is below it.
     * Returns null when the user has no profile embedding yet.
     */
    async recommendForUser(
      userId: string,
      {
        limit = 20,
        cursor,
        ...filters
      }: { limit?: number; cursor?: number } & RecommendationFilters = {},
    ) {
      const safeLimit = Math.min(limit, 50);

      const [userEmb] = await db
        .select({ embedding: userEmbeddings.embedding })
        .from(userEmbeddings)
        .where(eq(userEmbeddings.userId, userId))
        .orderBy(desc(userEmbeddings.createdAt))
        .limit(1);

      if (!userEmb) return null;

      const [provider] = await db
        .select({ steamId: userProviders.providerUserId })
        .from(userProviders)
        .where(eq(userProviders.userId, userId))
        .limit(1);

      let ownedIds: number[] = [];
      if (provider?.steamId) {
        const { response } = await ownedGamesEndpoint.getData(provider.steamId);
        ownedIds = response?.games?.map((g) => g.appid) ?? [];
      }

      // manual picks count as "already known" too - never recommend them back
      const favoriteIds = await favoritesService.getAppIds(userId);
      const excludeIds = [...new Set([...ownedIds, ...favoriteIds])];

      // jw. - embedding z bazy to number[]; do sql-a trzeba go w formacie wektora pgvector
      const similarityExpr = sql<number>`
    1 - (${gameEmbeddings.embedding} <=> ${toPgVector(userEmb.embedding)}::vector)
  `;

      const conditions = [eq(gameEmbeddings.embeddingVersion, ACTIVE_EMBEDDING_VERSION)];
      if (excludeIds.length) conditions.push(notInArray(gameEmbeddings.steamAppid, excludeIds));
      if (cursor !== undefined) conditions.push(sql`(${similarityExpr}) < ${cursor}`);

      if (filters.isFree !== undefined) conditions.push(eq(gameInfo.isFree, filters.isFree));
      if (filters.minDiscount !== undefined)
        conditions.push(gte(gameInfo.priceDiscountPercent, filters.minDiscount));
      if (filters.minReviewTier)
        conditions.push(inArray(gameInfo.reviewTier, REVIEW_TIER_ALLOWED[filters.minReviewTier]));
      if (filters.yearFrom !== undefined)
        // release_date is free-form text like "19 Nov, 2021"; take the first 4-digit year
        conditions.push(
          sql`substring(${gameInfo.releaseDate} from '[0-9]{4}')::int >= ${filters.yearFrom}`,
        );
      if (filters.platform) conditions.push(eq(PLATFORM_COLUMNS[filters.platform], true));

      const rows = await db
        .select({
          steamAppid: gameEmbeddings.steamAppid,
          name: gameInfo.name,
          similarity: similarityExpr,
          headerImage: gameInfo.headerImage,
          isFree: gameInfo.isFree,
          priceFinalFormatted: gameInfo.priceFinalFormatted,
          priceDiscountPercent: gameInfo.priceDiscountPercent,
          reviewTier: gameInfo.reviewTier,
        })
        .from(gameEmbeddings)
        .innerJoin(gameInfo, eq(gameInfo.steamAppid, gameEmbeddings.steamAppid))
        .where(and(...conditions))
        .orderBy(desc(similarityExpr))
        .limit(safeLimit);

      const items = rows.map(toGameCardItem);

      const nextCursor = items.length === safeLimit ? items[items.length - 1].similarity : null;

      return { items, nextCursor };
    },
  },
};
