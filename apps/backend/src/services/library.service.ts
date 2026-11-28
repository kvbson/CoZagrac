import { and, eq, inArray } from 'drizzle-orm';
import type { UserLibraryGame, UserLibraryResponse } from '@cozagrac/shared/contracts/api';
import { ownedGamesEndpoint } from '../clients/steam/endpoints/userContext/ownedGames.endpoint.js';
import { db } from '../db/init.js';
import { gameInfo, userGameRatings, userProviders } from '../drizzle/schema.js';

export const libraryService = {
  /**
   * User's Steam library enriched with header images for games present in
   * our catalog (name from DB preferred over Steam's), PLUS games rated
   * manually that are not in the Steam library (rated-games section).
   * Returns steamLinked=false when the account has no linked Steam profile.
   */
  async getLibrary(userId: string): Promise<UserLibraryResponse> {
    const [provider] = await db
      .select({ steamId: userProviders.providerUserId })
      .from(userProviders)
      .where(and(eq(userProviders.userId, userId), eq(userProviders.provider, 'steam')))
      .limit(1);

    const ratedRows = await db
      .select({
        steamAppid: userGameRatings.steamAppid,
        name: gameInfo.name,
        headerImage: gameInfo.headerImage,
      })
      .from(userGameRatings)
      .innerJoin(gameInfo, eq(gameInfo.steamAppid, userGameRatings.steamAppid))
      .where(eq(userGameRatings.userId, userId));

    if (!provider?.steamId) {
      // no Steam: the rated games ARE the library (rated-games section)
      return {
        steamLinked: false,
        items: ratedRows.map((row) => ({
          steamAppid: row.steamAppid,
          name: row.name ?? `Game ${row.steamAppid}`,
          playtimeForever: 0,
          headerImage: row.headerImage ?? null,
        })),
      };
    }

    const { response } = await ownedGamesEndpoint.getData(provider.steamId);
    const owned = response?.games ?? [];

    const ownedAppids = owned.map((game) => game.appid);

    const catalogAppids = [
      ...new Set([
        ...ownedAppids,
        ...ratedRows.map((row) => row.steamAppid),
      ]),
    ];

    const catalogRows = catalogAppids.length
      ? await db
          .select({
            steamAppid: gameInfo.steamAppid,
            name: gameInfo.name,
            headerImage: gameInfo.headerImage,
          })
          .from(gameInfo)
          .where(inArray(gameInfo.steamAppid, catalogAppids))
      : [];

    const catalog = new Map(catalogRows.map((row) => [row.steamAppid, row]));

    const items: UserLibraryGame[] = owned
      .map((game) => ({
        steamAppid: game.appid,
        name: catalog.get(game.appid)?.name ?? game.name,
        playtimeForever: game.playtime_forever ?? 0,
        headerImage: catalog.get(game.appid)?.headerImage ?? null,
      }));

    // rated games outside the Steam library land in the rated-games section
    const ratedOnly: UserLibraryGame[] = ratedRows
      .filter((row) => !ownedAppids.includes(row.steamAppid))
      .map((row) => ({
        steamAppid: row.steamAppid,
        name: row.name ?? `Game ${row.steamAppid}`,
        playtimeForever: 0,
        headerImage: row.headerImage ?? null,
      }));

    return { steamLinked: true, items: [...items, ...ratedOnly] };
  },
};
