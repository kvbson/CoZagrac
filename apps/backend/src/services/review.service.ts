import { desc, eq, sql, and } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db/init.js';
import { gameReviews } from '../drizzle/schema.js';
import { Tx } from '../types/db.types.js';
import { CreateReviewInput } from '../schemas/review.zod.js';

export type SyncResult = {
  savedPositive: number;
  savedNegative: number;
};

export const reviewService = {
  /**
   * Sync reviews for a single game
   */
  async syncForGame(steamAppid: number, reviews: CreateReviewInput[]): Promise<SyncResult> {
    if (reviews.length === 0) {
      return { savedPositive: 0, savedNegative: 0 };
    }

    return db.transaction(async (tx) => {
      return upsertReviews(tx, steamAppid, reviews);
    });
  },

  /**
   * Get current saved review counts (for resume)
   */
  async getReviewCountsForGame(steamAppid: number) {
    const [[{ positive }], [{ negative }]] = await Promise.all([
      db
        .select({ positive: sql<number>`count(*)` })
        .from(gameReviews)
        .where(and(eq(gameReviews.steamAppid, steamAppid), eq(gameReviews.votedUp, true))),

      db
        .select({ negative: sql<number>`count(*)` })
        .from(gameReviews)
        .where(and(eq(gameReviews.steamAppid, steamAppid), eq(gameReviews.votedUp, false))),
    ]);

    return {
      positive: Number(positive),
      negative: Number(negative),
    };
  },

  /**
   * Get already seen recommendationIds (for dedup)
   */
  async getRecommendationIdsForGame(steamAppid: number): Promise<string[]> {
    const rows = await db
      .select({ id: gameReviews.recommendationId })
      .from(gameReviews)
      .where(eq(gameReviews.steamAppid, steamAppid));

    return rows.map((r) => String(r.id));
  },

  /**
   * 📖 Public read API (unchanged)
   */
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

async function upsertReviews(
  tx: Tx,
  steamAppid: number,
  reviews: CreateReviewInput[],
): Promise<SyncResult> {
  let savedPositive = 0;
  let savedNegative = 0;

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
        playtimeForever: r.playtimeForever,
        language: r.language,
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
          playtimeForever: r.playtimeForever,
          reviewCreated: r.reviewCreated,
          steamPurchase: r.steamPurchase,
          language: r.language,
        },
      });

    if (r.votedUp) {
      savedPositive++;
    } else {
      savedNegative++;
    }
  }

  return { savedPositive, savedNegative };
}
