import { eq, inArray, and, isNull } from 'drizzle-orm';
import { db } from '../db/init.js';
import {
  gameInfo,
  genres,
  categories,
  gameMovies,
  gamePublishers,
  gameScreenshots,
  gameGenres,
  gameCategories,
  gameEmbeddings,
} from '../drizzle/schema.js';
import { CreateGameInput } from '../schemas/game.zod.js';
import { Tx } from '../types/db.types.js';
import { GameInfoResult, GamePayload } from '../types/game.types.js';
import { ACTIVE_EMBEDDING_VERSION } from './embeddings.service.js';

export const gameService = {
  /**
   * Sync one game
   */
  async sync(payload: CreateGameInput) {
    const steamAppid = payload.game.steamAppid;
    await db.transaction(async (tx) => {
      await upsertGame(tx, payload.game);

      await upsertGenres(tx, payload.genres);
      await upsertCategories(tx, payload.categories);

      await syncGenres(
        tx,
        steamAppid,
        payload.genres.map((g) => g.id),
      );
      await syncCategories(
        tx,
        steamAppid,
        payload.categories.map((c) => c.id),
      );

      await replacePublishers(tx, steamAppid, payload.publishers);
      await replaceMovies(tx, steamAppid, payload.movies);
      await replaceScreenshots(tx, steamAppid, payload.screenshots);
    });
  },

  async getAllAppIds(): Promise<number[]> {
    const rows = await db.select({ steamAppid: gameInfo.steamAppid }).from(gameInfo);
    return rows.map((r) => r.steamAppid);
  },

  async getIdsWithoutEmbeddings() {
    const rows = await db
      .select({ steamAppid: gameInfo.steamAppid })
      .from(gameInfo)
      .leftJoin(
        gameEmbeddings,
        and(
          eq(gameEmbeddings.steamAppid, gameInfo.steamAppid),
          eq(gameEmbeddings.embeddingVersion, ACTIVE_EMBEDDING_VERSION),
        ),
      )
      .where(isNull(gameEmbeddings.steamAppid));

    return rows.map((r) => r.steamAppid);
  },

  async getGameBaseInfo(appId: number) {
    const [row] = await db.select().from(gameInfo).where(eq(gameInfo.steamAppid, appId)).limit(1);

    return row ?? null;
  },

  async getGameGenres(appId: number) {
    const rows = await db
      .select({
        id: genres.id,
        name: genres.name,
      })
      .from(gameGenres)
      .innerJoin(genres, eq(genres.id, gameGenres.genreId))
      .where(eq(gameGenres.steamAppid, appId));
    return rows.filter((el) => el.name !== null) as {
      id: string;
      name: string;
    }[];
  },

  async getGameCategories(appId: number) {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
      })
      .from(gameCategories)
      .innerJoin(categories, eq(categories.id, gameCategories.categoryId))
      .where(eq(gameCategories.steamAppid, appId));
    return rows.filter((el) => el.name !== null) as {
      id: string;
      name: string;
    }[];
  },

  async getGameMovies(appId: number) {
    return db.select().from(gameMovies).where(eq(gameMovies.steamAppid, appId));
  },

  async getGamePublishers(appId: number) {
    return db.select().from(gamePublishers).where(eq(gamePublishers.steamAppid, appId));
  },

  async getGameScreenshots(appId: number) {
    return db.select().from(gameScreenshots).where(eq(gameScreenshots.steamAppid, appId));
  },

  async getByAppId(appId: number): Promise<GameInfoResult | null> {
    const base = await this.getGameBaseInfo(appId);
    if (!base || !base.name) return null;

    const [genres, categories, movies, publishers, screenshots] = await Promise.all([
      this.getGameGenres(appId),
      this.getGameCategories(appId),
      this.getGameMovies(appId),
      this.getGamePublishers(appId),
      this.getGameScreenshots(appId),
    ]);

    const result: GameInfoResult = {
      ...base,
      name: base.name,
      genres,
      categories,
      movies,
      publishers,
      screenshots,
    };

    return result;
  },
};

async function upsertGame(tx: Tx, game: CreateGameInput['game']) {
  await tx
    .insert(gameInfo)
    .values(game)
    .onConflictDoUpdate({
      target: gameInfo.steamAppid,
      set: {
        name: game.name,
        shortDescription: game.shortDescription,
        detailedDescription: game.detailedDescription,
        headerImage: game.headerImage,
        aboutTheGame: game.aboutTheGame,
        capsuleImage: game.capsuleImage,
        releaseDate: game.releaseDate,
        isFree: game.isFree,
        priceCurrency: game.priceCurrency,
        appUrl: game.appUrl,
        background: game.background,
        linuxMinimum: game.linuxMinimum,
        linuxRecommended: game.linuxRecommended,
        macMinimum: game.macMinimum,
        macRecommended: game.macRecommended,
        pcMinimum: game.pcMinimum,
        pcRecommended: game.pcRecommended,
        // metacriticScore: game.metacriticScore, //TODO: verify with api
        // supportedLanguages: game.supportedLanguages,
        platformLinux: game.platformLinux,
        platformMac: game.platformMac,
        platformWindows: game.platformWindows,
        priceDiscountPercent: game.priceDiscountPercent,
        priceFinal: game.priceFinal,
        priceFinalFormatted: game.priceFinalFormatted,
        priceInitial: game.priceInitial,
        priceInitialFormatted: game.priceInitialFormatted,
        releaseComingSoon: game.releaseComingSoon,
        reviewTier: game.reviewTier,
        requiredAge: game.requiredAge,
        website: game.website,
      },
    });
}

async function upsertGenres(tx: Tx, incoming: { id: string; description: string }[]) {
  if (!incoming.length) return;

  await tx
    .insert(genres)
    .values(
      incoming.map((g) => ({
        steamGenreId: Number(g.id),
        name: g.description,
      })),
    )
    .onConflictDoNothing();
}

async function upsertCategories(tx: Tx, incoming: { id: string; description: string }[]) {
  if (!incoming.length) return;

  await tx
    .insert(categories)
    .values(
      incoming.map((c) => ({
        steamCategoryId: Number(c.id),
        name: c.description,
      })),
    )
    .onConflictDoNothing();
}

async function syncGenres(tx: Tx, steamAppid: number, incomingSteamIds: string[]) {
  if (!incomingSteamIds.length) {
    await tx.delete(gameGenres).where(eq(gameGenres.steamAppid, steamAppid));
    return;
  }

  const steamIds = incomingSteamIds.map(Number);

  const genreRows = await tx
    .select({ id: genres.id })
    .from(genres)
    .where(inArray(genres.steamGenreId, steamIds));

  if (!genreRows.length) return;

  await tx.delete(gameGenres).where(eq(gameGenres.steamAppid, steamAppid));

  await tx.insert(gameGenres).values(
    genreRows.map((g) => ({
      steamAppid,
      genreId: g.id,
    })),
  );
}

async function syncCategories(tx: Tx, steamAppid: number, incomingSteamIds: string[]) {
  if (!incomingSteamIds.length) {
    await tx.delete(gameCategories).where(eq(gameCategories.steamAppid, steamAppid));
    return;
  }

  const steamIds = incomingSteamIds.map(Number);

  const categoryRows = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.steamCategoryId, steamIds));

  if (!categoryRows.length) {
    await tx.delete(gameCategories).where(eq(gameCategories.steamAppid, steamAppid));
    return;
  }

  await tx.delete(gameCategories).where(eq(gameCategories.steamAppid, steamAppid));

  await tx.insert(gameCategories).values(
    categoryRows.map((c) => ({
      steamAppid,
      categoryId: c.id, // UUID ✅
    })),
  );
}

async function replacePublishers(
  tx: Tx,
  steamAppid: number,
  publishers: GamePayload['publishers'],
) {
  await tx.delete(gamePublishers).where(eq(gamePublishers.steamAppid, steamAppid));

  if (!publishers.length) return;

  await tx.insert(gamePublishers).values(
    publishers.map((p) => ({
      steamAppid,
      publisherId: p.publisherId,
      name: p.name,
    })),
  );
}

async function replaceMovies(tx: Tx, steamAppid: number, movies: GamePayload['movies']) {
  await tx.delete(gameMovies).where(eq(gameMovies.steamAppid, steamAppid));

  if (!movies.length) return;

  await tx.insert(gameMovies).values(
    movies.map((m) => ({
      steamAppid,
      movieId: m.movieId,
      name: m.name,
      url: m.url,
      thumbnail: m.thumbnail,
    })),
  );
}

async function replaceScreenshots(
  tx: Tx,
  steamAppid: number,
  screenshots: GamePayload['screenshots'],
) {
  await tx.delete(gameScreenshots).where(eq(gameScreenshots.steamAppid, steamAppid));

  if (!screenshots.length) return;

  await tx.insert(gameScreenshots).values(
    screenshots.map((s) => ({
      steamAppid,
      screenshotId: s.screenshotId,
      pathFull: s.pathFull,
      pathThumbnail: s.pathThumbnail,
    })),
  );
}
