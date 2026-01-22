import { db } from '@api/db/init.js';
import { gameReviews } from '@api/drizzle/schema.js';
import { Tx } from '@api/types/db.types.js';
import { GamePayload } from '@api/types/game.types.js';
import { desc, eq, sql } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';

export const reviewService = {
  async syncForGame(steamAppid: number, reviews: GamePayload['reviews']) {
    await db.transaction(async (tx) => {
      await upsertReviews(tx, steamAppid, reviews);
    });
  },

  async getByGame(
    steamAppid: number,
    page: number,
    limit: number,
    sort: 'newest' | 'highestRating' | 'popularity',
  ) {
    const safeLimit = Math.min(limit, 100);
    const offset = (page - 1) * safeLimit;
    const sorts: Record<typeof sort, PgColumn> = {
      highestRating: gameReviews.weightedVoteScore,
      newest: gameReviews.reviewCreated,
      popularity: gameReviews.votesUp,
    };

    const [items, [{ count }]] = await Promise.all([
      db
        .select()
        .from(gameReviews)
        .where(eq(gameReviews.steamAppid, steamAppid))
        .orderBy(desc(sorts[sort]))
        .limit(safeLimit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(gameReviews)
        .where(eq(gameReviews.steamAppid, steamAppid)),
    ]);

    return {
      page,
      limit: safeLimit,
      total: Number(count),
      pages: Math.ceil(Number(count) / safeLimit),
      items,
    };
  },
};

async function upsertReviews(tx: Tx, steamAppid: number, reviews: GamePayload['reviews']) {
  for (const r of reviews) {
    await tx
      .insert(gameReviews)
      .values({
        steamAppid,
        recommendationId: r.recommendationId,
        review: r.review,
        votedUp: r.votedUp,
        votesUp: r.votesUp,
        votesFunny: r.votesFunny,
        weightedVoteScore: r.weightedVoteScore,
        steamPurchase: r.steamPurchase,
        commentCount: r.commentCount,
        reviewCreated: r.reviewCreated,
      })
      .onConflictDoUpdate({
        target: [gameReviews.steamAppid, gameReviews.recommendationId],
        set: {
          review: r.review,
          votedUp: r.votedUp,
          votesUp: r.votesUp,
          votesFunny: r.votesFunny,
          weightedVoteScore: r.weightedVoteScore,
          commentCount: r.commentCount,
        },
      });
  }
}
