import { eq, inArray } from 'drizzle-orm';
import type { UserFavoriteGame } from '@cozagrac/shared/contracts/api';
import { db } from '../db/init.js';
import { gameInfo, userFavoriteGames } from '../drizzle/schema.js';

/**
 * Manual profile basis: games the user picked as their favorites.
 * Doubles as the exclusion list in recommendations (the user clearly
 * knows those games) and as the wizard's persisted selection.
 */
export const favoritesService = {
  async getFavorites(userId: string): Promise<UserFavoriteGame[]> {
    const rows = await db
      .select({
        steamAppid: userFavoriteGames.steamAppid,
        name: gameInfo.name,
        headerImage: gameInfo.headerImage,
      })
      .from(userFavoriteGames)
      .innerJoin(gameInfo, eq(gameInfo.steamAppid, userFavoriteGames.steamAppid))
      .where(eq(userFavoriteGames.userId, userId));

    return rows.map((row) => ({
      steamAppid: row.steamAppid,
      name: row.name ?? `Game ${row.steamAppid}`,
      headerImage: row.headerImage ?? null,
    }));
  },

  async getAppIds(userId: string): Promise<number[]> {
    const rows = await db
      .select({ steamAppid: userFavoriteGames.steamAppid })
      .from(userFavoriteGames)
      .where(eq(userFavoriteGames.userId, userId));

    return rows.map((row) => row.steamAppid);
  },

  /**
   * Filters appids down to those present in our catalog (FK to game_info);
   * lets the controller reject too-small selections BEFORE replacing the
   * previously saved set.
   */
  async getKnownAppIds(appIds: number[]): Promise<number[]> {
    const known = await db
      .select({ steamAppid: gameInfo.steamAppid })
      .from(gameInfo)
      .where(inArray(gameInfo.steamAppid, appIds));

    return known.map((row) => row.steamAppid);
  },

  /** Replaces the whole favorite set with the given (catalog-validated) ids. */
  async replace(userId: string, appIds: number[]) {
    await db.transaction(async (tx) => {
      await tx.delete(userFavoriteGames).where(eq(userFavoriteGames.userId, userId));

      if (appIds.length) {
        await tx
          .insert(userFavoriteGames)
          .values(appIds.map((steamAppid) => ({ userId, steamAppid })));
      }
    });
  },
};
