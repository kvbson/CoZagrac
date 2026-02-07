import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/init.js';
import { gameEmbeddings, userEmbeddings } from '../drizzle/schema.js';
import { gameService } from './game.service.js';
import { reviewService } from './review.service.js';
import { logger } from '../utils/logger.js';
import { ownedGamesEndpoint } from '../clients/steam/endpoints/userContext/ownedGames.endpoint.js';
import { recentlyPlayedEndpoint } from '../clients/steam/endpoints/userContext/recentlyPlayed.endpoint.js';
import {
  trimText,
  l2Normalize,
  weightedMean,
  uniqueLimited,
  buildUserPreferenceText,
} from '../utils/embedding.helpers.js';
import { OpenAI } from 'openai';
import { userService } from './user.service.js';

export const LIMITS = {
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  logger: { debug: logger.debug, error: logger.error, info: logger.info, warn: logger.info },
});

const model = 'text-embedding-3-small';

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

      if (!shortDescription || !aboutTheGame) {
        logger.error(`Missing descriptions for appId: ${steamAppId}`);
        return;
      }

      const descriptionText = `${shortDescription}\n\n${aboutTheGame}`;

      /**
       * 3. Prepare genres + categories (ONE text)
       */
      const genres = gameInfo.genres?.map((g) => g.name) ?? [];
      const categories = gameInfo.categories?.map((c) => c.name) ?? [];

      const taxonomyText = `
          Game genres: ${genres.join(', ')}.
          Game features: ${categories.join(', ')}.
      `.trim();

      if (!taxonomyText) {
        logger.error(`Missing taxonomy for appId: ${steamAppId}`);
        return;
      }

      logger.info(
        `[GAME_EMBEDDINGS] Generating embeddings for game: ${steamAppId}. Taxonomy: ${taxonomyText}, Description: ${descriptionText}`,
      );

      /**
       * 4. Generate embeddings (batched)
       */

      const [descriptionRes, positiveRes, negativeRes, taxonomyRes] = await Promise.all([
        openai.embeddings.create({
          model,
          input: descriptionText,
        }),

        openai.embeddings.create({
          model,
          input: positiveTexts,
        }),

        openai.embeddings.create({
          model,
          input: negativeTexts,
        }),

        openai.embeddings.create({
          model,
          input: taxonomyText,
        }),
      ]);

      /**
       * 5. Aggregate review embeddings
       */
      const meanEmbedding = (vectors: number[][]): number[] => {
        const len = vectors[0].length;
        const out = Array(len).fill(0);

        for (const vec of vectors) {
          for (let i = 0; i < len; i++) {
            out[i] += vec[i];
          }
        }

        return out.map((v) => v / vectors.length);
      };

      const descriptionVec = descriptionRes.data[0].embedding;
      const positiveVec = meanEmbedding(positiveRes.data.map((d) => d.embedding));
      const negativeVec = meanEmbedding(negativeRes.data.map((d) => d.embedding));
      const taxonomyVec = taxonomyRes.data[0].embedding;

      /**
       * 6. Final weighted embedding
       */
      const finalEmbedding = l2Normalize(
        weightedMean([
          { vec: descriptionVec, weight: 0.4 },
          { vec: positiveVec, weight: 0.3 },
          { vec: negativeVec, weight: 0.15 },
          { vec: taxonomyVec, weight: 0.15 },
        ]),
      );

      /**
       * 7. Persist (delete + insert)
       */
      await db.transaction(async (tx) => {
        try {
          await tx.delete(gameEmbeddings).where(eq(gameEmbeddings.steamAppid, steamAppId));

          await tx.insert(gameEmbeddings).values({
            steamAppid: steamAppId,
            embedding: finalEmbedding,
            modelName: model,
          });
        } catch (error: unknown) {
          logger.error(`[GAME_EMBEDDINGS] Error during db transaction.`, error);
        }
      });
      logger.info(`[GAME_EMBEDDINGS] Game embeddings saved successfully.`);
      return finalEmbedding;
    },

    /**
     * Find similar games to a given vector
     */
    async findSimilar(embedding: number[], limit = 10) {
      const safeLimit = Math.min(limit, 50);

      return db
        .select({
          steamAppid: gameEmbeddings.steamAppid,
          similarity: sql<number>`
            1 - (${gameEmbeddings.embedding} <=> ${embedding})
          `,
        })
        .from(gameEmbeddings)
        .orderBy(
          desc(sql`
            1 - (${gameEmbeddings.embedding} <=> ${embedding})
          `),
        )
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
      const { steamId } = await userService.getById(id);
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

      if (!ownedGames.length || !recentGames.length) {
        logger.error('[USER_EMBEDDING] missing owned or recent games. Cancelling generating...');
        return;
      }

      const topGames = [...ownedGames]
        .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
        .slice(0, USER_LIMITS.MAX_GAMES_FOR_USER);

      /**
       * 1. Load game infos (genres + categories)
       */
      const gameInfos = await Promise.all(topGames.map((g) => gameService.getByAppId(g.appid)));

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
       * 2. Playstyle inference (implicit opinions)
       */
      const playstyleSignals: string[] = [];

      const totalPlaytime = ownedGames.reduce((a, g) => a + (g.playtime_forever ?? 0), 0) / 60;

      const recentPlaytime = recentGames.reduce((a, g) => a + (g.playtime_2weeks ?? 0), 0) / 60;

      if (recentPlaytime > 20) playstyleSignals.push('highly active player');
      if (recentPlaytime < 2) playstyleSignals.push('low activity player');
      if (totalPlaytime > 1000) playstyleSignals.push('hardcore gamer');

      /**
       * 3. User preference text (CORE)
       */
      const preferenceText = buildUserPreferenceText({
        genres,
        categories,
        topGames: topGames.map((g) => g.name).filter(Boolean),
        playstyle: playstyleSignals,
      });

      logger.info(
        `[USER_EMBEDDINGS] Generating embeddings for user: ${id}. Taxonomy: ${preferenceText}`,
      );

      /**
       * 4. Generate embeddings (SAME model as games)
       */
      const [taxonomyRes] = await Promise.all([
        openai.embeddings.create({
          model,
          input: preferenceText,
        }),
      ]);

      const taxonomyVec = taxonomyRes.data[0].embedding;

      /**
       * 5. Gameplay numeric bias (small)
       */
      const gameplayBiasText = `
        Total playtime: ${Math.round(totalPlaytime)} hours.
        Recently played hours: ${Math.round(recentPlaytime)}.
      `.trim();

      const gameplayRes = await openai.embeddings.create({
        model,
        input: gameplayBiasText,
      });

      /**
       * 6. Final user embedding
       */
      const finalEmbedding = l2Normalize(
        weightedMean([
          { vec: taxonomyVec, weight: 0.8 },
          { vec: gameplayRes.data[0].embedding, weight: 0.2 },
        ]),
      );

      /**
       * 7. Persist (delete + insert)
       */
      await db.transaction(async (tx) => {
        try {
          await tx.delete(userEmbeddings).where(eq(userEmbeddings.userId, id));

          await tx.insert(userEmbeddings).values({
            userId: id,
            embedding: finalEmbedding,
            modelName: model,
          });
        } catch (error: unknown) {
          logger.error(`[USER_EMBEDDINGS] Error during db transaction.`, error);
        }
      });

      logger.info(`[USER_EMBEDDINGS] User's embeddings saved successfully.`);

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
