import { db } from '@api/db/init.js';
import { gameEmbeddings, userEmbeddings } from '@api/drizzle/schema.js';
import { desc, eq, sql } from 'drizzle-orm';

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
