import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/init.js';
import { gameEmbeddings, gameInfo, userEmbeddings } from '../drizzle/schema.js';
import { CreateReviewInput } from '../schemas/review.zod.js';
import { CreateGameInput } from '../schemas/game.zod.js';
import { gameService } from './game.service.js';
import { reviewService } from './review.service.js';
import { logger } from '../utils/logger.js';

export const LIMITS = {
  MAX_REVIEW_CHARS: 2000, // ~500 tokenów
  MAX_POSITIVE_REVIEWS: 50,
  MAX_NEGATIVE_REVIEWS: 30,
  MAX_DESCRIPTION_CHARS: 4000,
};

function trimText(text: string, maxChars: number) {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function weightedMean(items: { vec: number[]; weight: number }[]): number[] {
  const len = items[0].vec.length;
  const out = Array(len).fill(0);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);

  for (const { vec, weight } of items) {
    for (let i = 0; i < len; i++) {
      out[i] += vec[i] * weight;
    }
  }

  return out.map((v) => v / totalWeight);
}

export const embeddingService = {
  game: {
    /**
     * Insert a new game embedding (append-only)
     */
    async insert(steamAppid: number, embedding: number[], modelName?: string) {
      await db.insert(gameEmbeddings).values({
        steamAppid,
        embedding,
        modelName,
      });
    },

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

      /**
       * 4. Generate embeddings (batched)
       */
      const model = 'text-embedding-3-small';

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
      const finalEmbedding = weightedMean([
        { vec: descriptionVec, weight: 0.4 },
        { vec: positiveVec, weight: 0.3 },
        { vec: negativeVec, weight: 0.15 },
        { vec: taxonomyVec, weight: 0.15 },
      ]);

      /**
       * 7. Persist (delete + insert)
       */
      await db.transaction(async (tx) => {
        await tx.delete(gameEmbeddings).where(eq(gameEmbeddings.steamAppid, steamAppId));

        await tx.insert(gameEmbeddings).values({
          steamAppid: steamAppId,
          embedding: finalEmbedding,
          modelName: model,
        });
      });

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
     * Insert a new user embedding
     */
    async insert(userId: string, embedding: number[], modelName?: string) {
      await db.insert(userEmbeddings).values({
        userId,
        embedding,
        modelName,
      });
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
