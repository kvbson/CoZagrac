import { and, eq, inArray } from 'drizzle-orm';
import type { UserLibraryGame, UserLibraryResponse } from '@cozagrac/shared/contracts/api';
import { ownedGamesEndpoint } from '../clients/steam/endpoints/userContext/ownedGames.endpoint.js';
import { db } from '../db/init.js';
import { gameInfo, userProviders } from '../drizzle/schema.js';

export const libraryService = {
  /**
   * User's Steam library enriched with header images for games present in
   * our catalog (name from DB preferred over Steam's).
   * Returns steamLinked=false when the account has no linked Steam profile.
   */
  async getLibrary(userId: string): Promise<UserLibraryResponse> {
    const [provider] = await db
      .select({ steamId: userProviders.providerUserId })
      .from(userProviders)
      .where(and(eq(userProviders.userId, userId), eq(userProviders.provider, 'steam')))
      .limit(1);

    if (!provider?.steamId) return { steamLinked: false, items: [] };

    const { response } = await ownedGamesEndpoint.getData(provider.steamId);
    const owned = response?.games ?? [];

    if (!owned.length) return { steamLinked: true, items: [] };

    const appids = owned.map((game) => game.appid);

    const catalogRows = await db
      .select({
        steamAppid: gameInfo.steamAppid,
        name: gameInfo.name,
        headerImage: gameInfo.headerImage,
      })
      .from(gameInfo)
      .where(inArray(gameInfo.steamAppid, appids));

    const catalog = new Map(catalogRows.map((row) => [row.steamAppid, row]));

    const items: UserLibraryGame[] = owned
      .map((game) => ({
        steamAppid: game.appid,
        name: catalog.get(game.appid)?.name ?? game.name,
        playtimeForever: game.playtime_forever ?? 0,
        headerImage: catalog.get(game.appid)?.headerImage ?? null,
      }))
      .sort((a, b) => b.playtimeForever - a.playtimeForever);

    return { steamLinked: true, items };
  },
};
