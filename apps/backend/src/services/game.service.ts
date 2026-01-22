import { db } from '@api/db/init.js';
import {
  categories,
  gameCategories,
  gameGenres,
  gameInfo,
  gameMovies,
  gamePublishers,
  gameScreenshots,
  genres,
} from '@api/drizzle/schema.js';
import { CreateGameInput } from '@api/schemas/game.zod.js';
import { Tx } from '@api/types/db.types.js';
import { GameInfoResult, GamePayload } from '@api/types/game.types.js';
import { and, eq, inArray } from 'drizzle-orm';

export const gameService = {
  /**
   * Sync one game (Steam = source of truth)
   */
  async sync(payload: CreateGameInput) {
    const steamAppid = payload.game.steamAppid;
    await db.transaction(async (tx) => {
      await upsertGame(tx, payload.game);

      await syncGenres(tx, steamAppid, payload.genres);
      await syncCategories(tx, steamAppid, payload.categories);

      await replacePublishers(tx, steamAppid, payload.publishers);
      await replaceMovies(tx, steamAppid, payload.movies);
      await replaceScreenshots(tx, steamAppid, payload.screenshots);
    });
  },

  async getByAppId(appId: number): Promise<GameInfoResult | null> {
    //TODO: maybe separate into diff queries later instead of left joins (zobacz ktore schematy maja najwiecej danych dla danej gry i je rozdziel)
    const rows = await db
      .select({
        game: gameInfo,
        genre: genres,
        category: categories,
        movie: gameMovies,
        publisher: gamePublishers,
        screenshot: gameScreenshots,
      })
      .from(gameInfo)
      .leftJoin(gameGenres, eq(gameGenres.steamAppid, gameInfo.steamAppid))
      .leftJoin(genres, eq(genres.id, gameGenres.genreId))
      .leftJoin(gameCategories, eq(gameCategories.steamAppid, gameInfo.steamAppid))
      .leftJoin(categories, eq(categories.id, gameCategories.categoryId))
      .leftJoin(gameMovies, eq(gameMovies.steamAppid, gameInfo.steamAppid))
      .leftJoin(gamePublishers, eq(gamePublishers.steamAppid, gameInfo.steamAppid))
      .leftJoin(gameScreenshots, eq(gameScreenshots.steamAppid, gameInfo.steamAppid))
      .where(eq(gameInfo.steamAppid, appId));

    if (!rows.length) return null;

    const base = rows[0].game;
    if (!base.name) return null;

    const result: GameInfoResult = {
      ...base,
      name: base.name,
      genres: [],
      categories: [],
      movies: [],
      publishers: [],
      screenshots: [],
    };

    const seen = {
      genres: new Set<string>(),
      categories: new Set<string>(),
      movies: new Set<number>(),
      publishers: new Set<number>(),
      screenshots: new Set<number>(),
    };

    for (const { category, genre, movie, publisher, screenshot } of rows) {
      if (genre?.name && !seen.genres.has(genre.id)) {
        seen.genres.add(genre.id);
        result.genres.push({ id: genre.id, name: genre.name });
      }

      if (category?.name && !seen.categories.has(category.id)) {
        seen.categories.add(category.id);
        result.categories.push({ id: category.id, name: category.name });
      }

      if (movie && !seen.movies.has(movie.movieId)) {
        seen.movies.add(movie.movieId);
        result.movies.push(movie);
      }

      if (publisher && !seen.publishers.has(publisher.publisherId)) {
        seen.publishers.add(publisher.publisherId);
        result.publishers.push(publisher);
      }

      if (screenshot && !seen.screenshots.has(screenshot.screenshotId)) {
        seen.screenshots.add(screenshot.screenshotId);
        result.screenshots.push(screenshot);
      }
    }

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
        requiredAge: game.requiredAge,
        website: game.website,
      },
    });
}

async function syncGenres(tx: Tx, steamAppid: number, incomingIds: string[]) {
  const current: { genreId: string }[] = await tx
    .select({ genreId: gameGenres.genreId })
    .from(gameGenres)
    .where(eq(gameGenres.steamAppid, steamAppid));

  const currentIds = current.map((g) => g.genreId);

  const currentSet = new Set(currentIds);
  const incomingSet = new Set(incomingIds);

  const toAdd = incomingIds.filter((id) => !currentSet.has(id));
  const toRemove = currentIds.filter((id) => !incomingSet.has(id));

  if (toRemove.length) {
    await tx
      .delete(gameGenres)
      .where(and(eq(gameGenres.steamAppid, steamAppid), inArray(gameGenres.genreId, toRemove)));
  }

  if (toAdd.length) {
    await tx.insert(gameGenres).values(toAdd.map((genreId) => ({ steamAppid, genreId })));
  }
}

async function syncCategories(tx: Tx, steamAppid: number, incomingIds: string[]) {
  const current: { categoryId: string }[] = await tx
    .select({ categoryId: gameCategories.categoryId })
    .from(gameCategories)
    .where(eq(gameCategories.steamAppid, steamAppid));

  const currentIds = current.map((c) => c.categoryId);

  const currentSet = new Set(currentIds);
  const incomingSet = new Set(incomingIds);

  const toAdd = incomingIds.filter((id) => !currentSet.has(id));
  const toRemove = currentIds.filter((id) => !incomingSet.has(id));

  if (toRemove.length) {
    await tx
      .delete(gameCategories)
      .where(
        and(
          eq(gameCategories.steamAppid, steamAppid),
          inArray(gameCategories.categoryId, toRemove),
        ),
      );
  }

  if (toAdd.length) {
    await tx.insert(gameCategories).values(toAdd.map((categoryId) => ({ steamAppid, categoryId })));
  }
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
