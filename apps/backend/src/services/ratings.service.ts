import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { UserRating } from '@cozagrac/shared/contracts/api';
import { db } from '../db/init.js';
import { gameInfo, userGameRatings } from '../drizzle/schema.js';

/**
 * Explicit user feedback: a 1-5 rating on a single game, written from
 * recommendation cards and library entries. The recommendation engine
 * consumes it as Rocchio-style centroid correction; rated games also leave
 * the recommendation candidate set.
 */
export const ratingsService = {
  /** All ratings of the user, enriched with catalog name/image for the UI. */
  async getRatings(userId: string): Promise<UserRating[]> {
    const rows = await db
      .select({
        steamAppid: userGameRatings.steamAppid,
        rating: userGameRatings.rating,
        name: gameInfo.name,
        headerImage: gameInfo.headerImage,
      })
      .from(userGameRatings)
      .innerJoin(gameInfo, eq(gameInfo.steamAppid, userGameRatings.steamAppid))
      .where(eq(userGameRatings.userId, userId));

    return rows.map((row) => ({
      steamAppid: row.steamAppid,
      rating: row.rating,
      name: row.name ?? `Game ${row.steamAppid}`,
      headerImage: row.headerImage ?? null,
    }));
  },

  /** True when the appid exists in our catalog (FK to game_info would throw otherwise). */
  async isKnownAppId(steamAppid: number): Promise<boolean> {
    const rows = await db
      .select({ steamAppid: gameInfo.steamAppid })
      .from(gameInfo)
      .where(eq(gameInfo.steamAppid, steamAppid))
      .limit(1);

    return rows.length > 0;
  },

  /** Upserts a single rating (last write wins, per user + game). */
  async upsert(userId: string, steamAppid: number, rating: number): Promise<void> {
    await db
      .insert(userGameRatings)
      .values({ userId, steamAppid, rating })
      .onConflictDoUpdate({
        target: [userGameRatings.userId, userGameRatings.steamAppid],
        set: { rating, updatedAt: sql`now()` },
      });
  },

  /** Removes a rating; idempotent (no-op when absent). */
  async remove(userId: string, steamAppid: number): Promise<void> {
    await db
      .delete(userGameRatings)
      .where(and(eq(userGameRatings.userId, userId), eq(userGameRatings.steamAppid, steamAppid)));
  },
};
