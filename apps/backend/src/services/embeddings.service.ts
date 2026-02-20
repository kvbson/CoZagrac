import { desc, eq, sql } from 'drizzle-orm';
import { model, openAiClient } from '../clients/openai/index.js';
import { ownedGamesEndpoint } from '../clients/steam/endpoints/userContext/ownedGames.endpoint.js';
import { recentlyPlayedEndpoint } from '../clients/steam/endpoints/userContext/recentlyPlayed.endpoint.js';
import { db } from '../db/init.js';
import { gameEmbeddings, userEmbeddings } from '../drizzle/schema.js';
import {
  buildUserPreferenceText,
  chunkReviews,
  l2Normalize,
  meanOrZero,
  toPgVector,
  trimText,
  uniqueLimited,
  weightedMean,
} from '../utils/embedding.helpers.js';
import { logger } from '../utils/logger.js';
import { gameService } from './game.service.js';
import { reviewService } from './review.service.js';
import { userService } from './user.service.js';

export const LIMITS = {
  MIN_REVIEW_CHARS: 200,
  MAX_REVIEW_CHARS: 2000, // ~500 tokenów
  MAX_POSITIVE_REVIEWS: 50,
  MAX_NEGATIVE_REVIEWS: 30,
  MAX_DESCRIPTION_CHARS: 4000,
};

export const USER_LIMITS = {
  MAX_GAMES_FOR_USER: 30,
  MAX_GENRES: 50,
  MAX_CATEGORIES: 50,
};

export const ACTIVE_EMBEDDING_VERSION = 'v1';

export const embeddingService = {
  game: {
    /**
     * Generate and save new game embedding
     */
    async generateGameEmbedding(steamAppId: number) {
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
        openAiClient.embeddings.create({
          model,
          input: descriptionText,
        }),

        positiveChunks.length
          ? openAiClient.embeddings.create({
              model,
              input: positiveChunks,
            })
          : null,

        negativeChunks.length
          ? openAiClient.embeddings.create({
              model,
              input: negativeChunks,
            })
          : null,

        openAiClient.embeddings.create({
          model,
          input: taxonomyText,
        }),
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
     * Find similar games to a given vector
     */
    async findSimilar(embedding: number[], limit = 10) {
      const safeLimit = Math.min(limit, 50);
      const vectorSql = toPgVector(embedding);

      const similarityExpr = sql<number>`
  1 - (${gameEmbeddings.embedding} <=> ${vectorSql}::vector)
`;
      return db
        .select({
          steamAppid: gameEmbeddings.steamAppid,
          similarity: similarityExpr,
        })
        .from(gameEmbeddings)
        .orderBy(desc(similarityExpr))
        .limit(safeLimit);
    },

    /**
     * Find similar games to an existing game
     */
    async findSimilarToGame(steamAppid: number, limit = 10) {
      const [row] = await db
        .select({ embedding: gameEmbeddings.embedding })
        .from(gameEmbeddings)
        .where(eq(gameEmbeddings.steamAppid, steamAppid))
        .orderBy(desc(gameEmbeddings.createdAt))
        .limit(1);

      if (!row) return [];

      return this.findSimilar(row.embedding, limit);
    },
  },

  user: {
    /**
     * Generate and save user embeddings
     */
    async generateUserEmbedding(id: string) {
      const user = await userService.getById(id);
      const steamId = user?.steamId;
      if (!steamId) {
        logger.error('[USER_EMBEDDING] user misses steamId - connect steam account first.');
        return;
      }

      const [{ response: owned }, { response: recent }] = await Promise.all([
        ownedGamesEndpoint.getData(steamId),
        recentlyPlayedEndpoint.getData(steamId),
      ]);

      const ownedGames = owned?.games ?? [];
      const recentGames = recent?.games ?? [];

      if (!ownedGames.length) {
        logger.warn('[USER_EMBEDDING] No owned games – cannot generate embedding.');
        return;
      }

      const topGames = [...ownedGames]
        .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
        .slice(0, USER_LIMITS.MAX_GAMES_FOR_USER);

      /**
       * 1. Load game infos
       */
      const gameInfos = await Promise.all(topGames.map((g) => gameService.getByAppId(g.appid)));

      /**
       * 2. Aggregate genres & categories
       */
      const genres = uniqueLimited(
        gameInfos.flatMap((g) => g?.genres ?? []),
        USER_LIMITS.MAX_GENRES,
        (g) => g.id,
      ).map((g) => g.name);

      const categories = uniqueLimited(
        gameInfos.flatMap((g) => g?.categories ?? []),
        USER_LIMITS.MAX_CATEGORIES,
        (c) => c.id,
      ).map((c) => c.name);

      /**
       * 3. Playstyle inference
       */
      const playstyleSignals: string[] = [];

      const totalPlaytime = ownedGames.reduce((a, g) => a + (g.playtime_forever ?? 0), 0) / 60;

      const recentPlaytime = recentGames.length
        ? recentGames.reduce((a, g) => a + (g.playtime_2weeks ?? 0), 0) / 60
        : 0;

      if (recentPlaytime > 20) playstyleSignals.push('plays very frequently');
      if (recentPlaytime < 2) playstyleSignals.push('plays occasionally');
      if (totalPlaytime > 1000) playstyleSignals.push('hardcore gamer');

      /**
       * 4. CORE preference text (high signal)
       */
      const activitySummary = `
          The user has played games for approximately ${Math.round(totalPlaytime)} hours in total
          and played about ${Math.round(recentPlaytime)} hours in the last two weeks.
      `.trim();
      const preferenceText = [
        buildUserPreferenceText({
          genres,
          categories,
          topGames: topGames.map((g) => g.name).filter(Boolean),
          playstyle: playstyleSignals,
        }),
        activitySummary,
      ].join('\n\n');
      /**
       * 5. Games played text (simple, stable)
       */
      const gamesText = `
            Games frequently played by the user:
            ${topGames.map((g) => `- ${g.name}`).join('\n')}
      `.trim();
      logger.debug('[USER_EMBEDDINGS][INPUT]', {
        userId: id,
        ownedGames: ownedGames.length,
        topGames: topGames.length,
        genres: genres.length,
        categories: categories.length,
        playstyleSignals,
        totalPlaytime: Math.round(totalPlaytime),
        recentPlaytime: Math.round(recentPlaytime),
      });
      /**
       * 6. Embeddings
       */
      const [preferenceRes, gamesRes] = await Promise.all([
        openAiClient.embeddings.create({
          model,
          input: preferenceText,
        }),

        openAiClient.embeddings.create({
          model,
          input: gamesText,
        }),
      ]);

      const preferenceVec = preferenceRes.data[0].embedding;
      const gamesVec = gamesRes.data[0].embedding;

      /**
       * 7. Final user embedding
       */
      const finalEmbedding = l2Normalize(
        weightedMean([
          { vec: preferenceVec, weight: 0.7 },
          { vec: gamesVec, weight: 0.3 },
        ]),
      );
      logger.debug('[USER_EMBEDDINGS][VECTOR]', {
        userId: id,
        dimension: finalEmbedding.length,
        normApprox: Math.sqrt(finalEmbedding.reduce((a, v) => a + v * v, 0)).toFixed(4),
      });
      /**
       * 8. Persist
       */
      await db.transaction(async (tx) => {
        await tx.delete(userEmbeddings).where(eq(userEmbeddings.userId, id));
        await tx.insert(userEmbeddings).values({
          userId: id,
          embedding: finalEmbedding,
          modelName: model,
          embeddingVersion: ACTIVE_EMBEDDING_VERSION,
        });
      });
      logger.info('[USER_EMBEDDINGS][SUMMARY]', {
        userId: id,
        embeddingVersion: ACTIVE_EMBEDDING_VERSION,
        topGames: topGames.slice(0, 5).map((g) => g.name),
        genres: genres.slice(0, 5),
      });
      return finalEmbedding;
    },

    /**
     * Recommend games for a user
     */
    async recommendGames(userId: string, limit = 10) {
      const [userRow] = await db
        .select({ embedding: userEmbeddings.embedding })
        .from(userEmbeddings)
        .where(eq(userEmbeddings.userId, userId))
        .orderBy(desc(userEmbeddings.createdAt))
        .limit(1);

      if (!userRow) return [];

      const safeLimit = Math.min(limit, 50);

      return db
        .select({
          steamAppid: gameEmbeddings.steamAppid,
          similarity: sql<number>`
            1 - (${gameEmbeddings.embedding} <=> ${userRow.embedding})
          `,
        })
        .from(gameEmbeddings)
        .orderBy(
          desc(sql`
            1 - (${gameEmbeddings.embedding} <=> ${userRow.embedding})
          `),
        )
        .limit(safeLimit);
    },
  },

  /**
   * Recommend games for a user
   * next cursor - last item recommended for user, we want to get next batch below the cursor
   */
  async recommendGamesInfinite(userEmbedding: number[], limit = 20, cursor?: { score: number }) {
    const safeLimit = Math.min(limit, 50);

    const similarityExpr = sql<number>`
    1 - (${gameEmbeddings.embedding} <=> ${userEmbedding})
  `;

    const whereClause = cursor ? sql`${similarityExpr} < ${cursor.score}` : undefined;

    const rows = await db
      .select({
        steamAppid: gameEmbeddings.steamAppid,
        score: similarityExpr,
      })
      .from(gameEmbeddings)
      .where(whereClause)
      .orderBy(desc(similarityExpr))
      .limit(safeLimit);

    const nextCursor = rows.length > 0 ? { score: rows[rows.length - 1].score } : null;

    return {
      items: rows,
      nextCursor,
    };
  },
};
