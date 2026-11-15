import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { UserRating } from '@cozagrac/shared/contracts/api';
import { db } from '../db/init.js';
import { gameEmbeddings, gameInfo, userGameRatings } from '../drizzle/schema.js';

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

  /** Clears every rating of the user (full feedback reset). */
  async removeAll(userId: string): Promise<void> {
    await db.delete(userGameRatings).where(eq(userGameRatings.userId, userId));
  },

  /** Appids the user has rated; they leave the recommendation candidate set. */
  async getRatedAppIds(userId: string): Promise<number[]> {
    const rows = await db
      .select({ steamAppid: userGameRatings.steamAppid })
      .from(userGameRatings)
      .where(eq(userGameRatings.userId, userId));

    return rows.map((row) => row.steamAppid);
  },

  /** Ratings as an appid -> rating lookup for the profile-build weighting. */
  async getRatingMap(userId: string): Promise<Map<number, number>> {
    const rows = await db
      .select({ steamAppid: userGameRatings.steamAppid, rating: userGameRatings.rating })
      .from(userGameRatings)
      .where(eq(userGameRatings.userId, userId));

    return new Map(rows.map((row) => [row.steamAppid, row.rating]));
  },

  /**
   * Ratings joined with the games' current embeddings - input for the
   * query-time centroid correction. embeddingVersion passed by the caller
   * (no import cycle with embeddings.service); games without an embedding
   * yet simply do not appear here.
   */
  async getRatedEmbeddings(
    userId: string,
    embeddingVersion: string,
  ): Promise<{ steamAppid: number; rating: number; embedding: number[] }[]> {
    const rows = await db
      .select({
        steamAppid: userGameRatings.steamAppid,
        rating: userGameRatings.rating,
        embedding: gameEmbeddings.embedding,
      })
      .from(userGameRatings)
      .innerJoin(
        gameEmbeddings,
        and(
          eq(gameEmbeddings.steamAppid, userGameRatings.steamAppid),
          eq(gameEmbeddings.embeddingVersion, embeddingVersion),
        ),
      )
      .where(eq(userGameRatings.userId, userId));

    return rows;
  },
};
