import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only mock API for running the frontend without the backend:
 *   npm run dev:mock   -> full mock mode (all /api requests answered here)
 *   npm run dev        -> proxy error fallback: when the backend is down,
 *                         /api requests fall back to these canned responses
 * Not part of the app bundle (lives outside src/, only loaded by vite.config.ts).
 */

type MockGame = {
  steamAppid: number;
  name: string;
  isFree: boolean;
  priceFinalFormatted: string | null;
  priceDiscountPercent: number | null;
  reviewTier: string | null;
  shortDescription: string;
  releaseDate: string;
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  /** top genres (taxonomy); used by cards, the genre filter and facets */
  genres: string[];
};

const headerImage = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

const CATALOG: MockGame[] = [
  { steamAppid: 570, name: 'Dota 2', isFree: true, priceFinalFormatted: null, priceDiscountPercent: null, reviewTier: 'S', shortDescription: 'A team-based MOBA with deep strategy.', releaseDate: '9 lipca 2013', platforms: { windows: true, mac: true, linux: true }, genres: ['Action', 'Strategy', 'Free to Play'] },
  { steamAppid: 730, name: 'Counter-Strike 2', isFree: true, priceFinalFormatted: null, priceDiscountPercent: null, reviewTier: 'S', shortDescription: 'The world’s classic competitive FPS.', releaseDate: '27 września 2023', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'Free to Play'] },
  { steamAppid: 1091500, name: 'Cyberpunk 2077', isFree: false, priceFinalFormatted: '149,99 zł', priceDiscountPercent: 50, reviewTier: 'A', shortDescription: 'An open-world action-adventure in Night City.', releaseDate: '10 grudnia 2020', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'RPG', 'Open World'] },
  { steamAppid: 271590, name: 'Grand Theft Auto V', isFree: false, priceFinalFormatted: '129,99 zł', priceDiscountPercent: null, reviewTier: 'S', shortDescription: 'Crime, heists and an open world in Los Santos.', releaseDate: '14 kwietnia 2015', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'Open World', 'Adventure'] },
  { steamAppid: 1174180, name: 'Red Dead Redemption 2', isFree: false, priceFinalFormatted: '259,99 zł', priceDiscountPercent: null, reviewTier: 'S', shortDescription: 'Epic tale of life in America’s unforgiving heartland.', releaseDate: '5 grudnia 2019', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'Adventure', 'Open World'] },
  { steamAppid: 578080, name: 'PUBG: BATTLEGROUNDS', isFree: true, priceFinalFormatted: null, priceDiscountPercent: null, reviewTier: 'A', shortDescription: 'Battle royale where 100 players fight to survive.', releaseDate: '21 grudnia 2017', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'Free to Play'] },
  { steamAppid: 359550, name: 'Tom Clancy’s Rainbow Six Siege', isFree: false, priceFinalFormatted: '79,99 zł', priceDiscountPercent: 60, reviewTier: 'A', shortDescription: 'Tactical 5v5 shooter with destructible environments.', releaseDate: '1 grudnia 2015', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'Strategy'] },
  { steamAppid: 1086940, name: 'Baldur’s Gate 3', isFree: false, priceFinalFormatted: '199,99 zł', priceDiscountPercent: null, reviewTier: 'S', shortDescription: 'A story-rich party RPG set in D&D’s Forgotten Realms.', releaseDate: '3 sierpnia 2023', platforms: { windows: true, mac: true, linux: false }, genres: ['RPG', 'Strategy', 'Adventure'] },
  { steamAppid: 1245620, name: 'ELDEN RING', isFree: false, priceFinalFormatted: '199,99 zł', priceDiscountPercent: 30, reviewTier: 'S', shortDescription: 'A vast fantasy world of danger and wonder.', releaseDate: '25 lutego 2022', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'RPG', 'Open World'] },
  { steamAppid: 2073850, name: 'THE FINALS', isFree: true, priceFinalFormatted: null, priceDiscountPercent: null, reviewTier: 'A', shortDescription: 'Destructible arenas, team-based virtual combat show.', releaseDate: '7 grudnia 2023', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'Free to Play'] },
  { steamAppid: 1517290, name: 'Bermuda Lost Living: Steam Edition', isFree: false, priceFinalFormatted: '39,99 zł', priceDiscountPercent: null, reviewTier: 'B', shortDescription: 'Survival adventure on a mysterious island.', releaseDate: '14 czerwca 2021', platforms: { windows: true, mac: true, linux: true }, genres: ['Adventure', 'Survival'] },
  { steamAppid: 1085660, name: 'Destiny 2', isFree: true, priceFinalFormatted: null, priceDiscountPercent: null, reviewTier: 'A', shortDescription: 'A shared-world shooter with rich lore.', releaseDate: '24 września 2019', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'Free to Play'] },
  { steamAppid: 1593500, name: 'Gothic 2 remake demo', isFree: false, priceFinalFormatted: '99,99 zł', priceDiscountPercent: 10, reviewTier: 'B', shortDescription: 'A cult classic RPG returns, rebuilt.', releaseDate: '1 października 2024', platforms: { windows: true, mac: false, linux: false }, genres: ['RPG', 'Open World'] },
  { steamAppid: 220, name: 'Half-Life 2', isFree: false, priceFinalFormatted: '29,99 zł', priceDiscountPercent: null, reviewTier: 'S', shortDescription: 'A landmark sci-fi FPS from Valve.', releaseDate: '16 listopada 2004', platforms: { windows: true, mac: true, linux: true }, genres: ['Action', 'Adventure'] },
  { steamAppid: 377160, name: 'Fallout 4', isFree: false, priceFinalFormatted: '99,99 zł', priceDiscountPercent: 75, reviewTier: 'A', shortDescription: 'Post-apocalyptic open-world RPG in the Commonwealth.', releaseDate: '10 listopada 2015', platforms: { windows: true, mac: false, linux: false }, genres: ['RPG', 'Open World', 'Survival'] },
  { steamAppid: 1623730, name: 'Pacific Drive', isFree: false, priceFinalFormatted: '119,99 zł', priceDiscountPercent: null, reviewTier: 'B', shortDescription: 'Survival driving through an anomalous zone.', releaseDate: '22 lutego 2024', platforms: { windows: true, mac: false, linux: false }, genres: ['Survival', 'Adventure'] },
  { steamAppid: 1203620, name: 'Enshrouded', isFree: false, priceFinalFormatted: '104,99 zł', priceDiscountPercent: 20, reviewTier: 'B', shortDescription: 'Survival crafting in a voxel world shrouded in fog.', releaseDate: '24 stycznia 2024', platforms: { windows: true, mac: false, linux: false }, genres: ['Survival', 'RPG', 'Open World'] },
  { steamAppid: 2246340, name: 'Monster Hunter Wilds', isFree: false, priceFinalFormatted: '229,99 zł', priceDiscountPercent: null, reviewTier: 'A', shortDescription: 'Hunt colossal monsters in dynamic ecosystems.', releaseDate: '28 lutego 2025', platforms: { windows: true, mac: false, linux: false }, genres: ['Action', 'RPG'] },
];

const byAppId = (appId: number) => CATALOG.find((game) => game.steamAppid === appId);

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

/** in-memory ratings store (module-lifetime; survives HMR within the session) */
const MOCK_RATINGS = new Map<number, number>([
  [1517290, 4], // not in the mock "Steam library" below -> shows in Rated games
  [1623730, 2],
]);

/** appids the mock Steam library contains (first 10 catalog entries; the
 * last two rated games intentionally fall outside it -> Rated games tab) */
const MOCK_LIBRARY_APPIDS = new Set(CATALOG.slice(0, 10).map((game) => game.steamAppid));

const readBody = async (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        resolve(typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const recommendationItem = (game: MockGame, similarity: number) => ({
  steamAppid: game.steamAppid,
  name: game.name,
  similarity,
  headerImage: headerImage(game.steamAppid),
  isFree: game.isFree,
  priceFinalFormatted: game.priceFinalFormatted,
  priceDiscountPercent: game.priceDiscountPercent,
  reviewTier: game.reviewTier,
  genres: game.genres,
});

const getRecommendations = (limit: number, genres: string[]) => {
  // genre facet: OR within the selected genres (same semantics as the backend)
  const candidates = genres.length
    ? CATALOG.filter((game) => game.genres.some((g) => genres.includes(g)))
    : CATALOG;

  return {
    items: candidates.slice(0, limit).map((game, index) => recommendationItem(game, Number((0.92 - index * 0.03).toFixed(4)))),
    nextCursor: null,
    hasEmbedding: true,
  };
};

/** genre facets with game counts (options for the genre filter) */
const getGenreFacets = () => {
  const counts = new Map<string, number>();
  for (const game of CATALOG) {
    for (const genre of game.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, gameCount]) => ({ name, gameCount }))
    .sort((a, b) => b.gameCount - a.gameCount);
};

const MOCK_EXPLAIN = {
  source: 'manual-games',
  createdAt: new Date().toISOString(),
  gamesUsed: 10,
  basisGames: CATALOG.slice(0, 10).map((game, index) => ({
    steamAppid: game.steamAppid,
    name: game.name,
    headerImage: headerImage(game.steamAppid),
    playtimeForever: null,
    // rating 4 on two games, 2 on one, rest unrated -> weight = rating/3
    weight: Number((index === 0 ? 4 / 3 : index === 1 ? 2 / 3 : index === 2 ? 4 / 3 : 1).toFixed(3)),
    rating: index === 0 || index === 2 ? 4 : index === 1 ? 2 : null,
  })),
  ratedGames: [...MOCK_RATINGS.entries()].map(([steamAppid, rating]) => ({
    steamAppid,
    name: byAppId(steamAppid)?.name ?? `Game ${steamAppid}`,
    rating,
    effect: (rating >= 4 ? 'toward' : rating <= 2 ? 'away' : 'neutral') as
      | 'toward'
      | 'away'
      | 'neutral',
  })),
};

const handleApi = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
  const { pathname } = url;
  const method = req.method ?? 'GET';
  const key = `${method} ${pathname}`;

  switch (key) {
    case 'GET /api/user/me':
      sendJson(res, 200, { userId: MOCK_USER_ID, steamLinked: true });
      return true;

    case 'GET /api/user/me/favorites':
      sendJson(res, 200, {
        items: CATALOG.slice(0, 10).map((game) => ({
          steamAppid: game.steamAppid,
          name: game.name,
          headerImage: headerImage(game.steamAppid),
        })),
      });
      return true;

    case 'PUT /api/user/me/favorites': {
      const body = await readBody(req);
      const appIds = Array.isArray(body.appIds) ? body.appIds : [];
      const items = appIds
        .map((appId) => byAppId(Number(appId)))
        .filter((game) => game !== undefined)
        .map((game) => ({
          steamAppid: game.steamAppid,
          name: game.name,
          headerImage: headerImage(game.steamAppid),
        }));
      sendJson(res, 200, { items });
      return true;
    }

    case 'GET /api/user/me/library': {
      // steam part: first 12 catalog games with playtime; plus rated games
      // outside that set (rated-games section, playtime 0)
      const libraryItems = CATALOG.filter((game) => MOCK_LIBRARY_APPIDS.has(game.steamAppid)).map(
        (game, index) => ({
          steamAppid: game.steamAppid,
          name: game.name,
          playtimeForever: Math.round((1 + index * 3.7) * 60),
          headerImage: headerImage(game.steamAppid),
        }),
      );
      const ratedOnly = [...MOCK_RATINGS.entries()]
        .filter(([appid]) => !MOCK_LIBRARY_APPIDS.has(appid))
        .map(([appid, rating]) => {
          const game = byAppId(appid);
          return {
            steamAppid: appid,
            name: game?.name ?? `Game ${appid}`,
            playtimeForever: 0,
            headerImage: headerImage(appid),
            rating,
          };
        });
      sendJson(res, 200, { steamLinked: true, items: [...libraryItems, ...ratedOnly] });
      return true;
    }

    case 'GET /api/user/me/recommendations': {
      const limit = Math.min(Number(url.searchParams.get('limit')) || 20, CATALOG.length);
      const genresParam = url.searchParams.get('genres');
      const genres = genresParam
        ? [...new Set(genresParam.split(',').map((g) => g.trim()).filter(Boolean))]
        : [];
      sendJson(res, 200, getRecommendations(limit, genres));
      return true;
    }

    case 'GET /api/user/me/recommendations/explain':
      sendJson(res, 200, MOCK_EXPLAIN);
      return true;

    case 'GET /api/game/taxonomy':
      sendJson(res, 200, { items: getGenreFacets() });
      return true;

    case 'GET /api/user/me/embedding/status':
      sendJson(res, 200, { status: 'done', gamesUsed: 10, source: 'manual-games' });
      return true;

    case 'GET /api/user/me/ratings': {
      // ratings persisted in module memory (see MOCK_RATINGS below)
      sendJson(res, 200, {
        items: [...MOCK_RATINGS.entries()].map(([steamAppid, rating]) => ({
          steamAppid,
          rating,
          name: byAppId(steamAppid)?.name ?? `Game ${steamAppid}`,
          headerImage: headerImage(steamAppid),
        })),
      });
      return true;
    }

    case 'POST /api/auth/logout':
      sendJson(res, 200, { message: 'mocked logout' });
      return true;

    default:
      break;
  }

  // profile details: /api/user?id= (account page)
  if (key === 'GET /api/user') {
    const id = url.searchParams.get('id');
    sendJson(res, 200, {
      userId: id ?? MOCK_USER_ID,
      steamId: id === MOCK_USER_ID ? '76561198000000001' : null,
      email: 'mock-user@example.com',
    });
    return true;
  }

  // search used by the profile wizard: /api/game/search?q=&limit=
  if (key === 'GET /api/game/search') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const limit = Number(url.searchParams.get('limit')) || 20;
    const items = CATALOG.filter((game) => game.name.toLowerCase().includes(q))
      .slice(0, limit)
      .map((game) => ({
        steamAppid: game.steamAppid,
        name: game.name,
        headerImage: headerImage(game.steamAppid),
        isFree: game.isFree,
        priceFinalFormatted: game.priceFinalFormatted,
        priceDiscountPercent: game.priceDiscountPercent,
        reviewTier: game.reviewTier,
      }));
    sendJson(res, 200, { items });
    return true;
  }

  // game details: /api/game?appId=
  if (key === 'GET /api/game') {
    const game = byAppId(Number(url.searchParams.get('appId')));
    if (!game) {
      sendJson(res, 404, { message: 'Game not found in mock catalog' });
      return true;
    }
    sendJson(res, 200, {
      steamAppid: game.steamAppid,
      name: game.name,
      shortDescription: game.shortDescription,
      aboutTheGame: `<p>${game.shortDescription}</p>`,
      releaseDate: game.releaseDate,
      releaseComingSoon: false,
      isFree: game.isFree,
      requiredAge: 0,
      platformWindows: game.platforms.windows,
      platformMac: game.platforms.mac,
      platformLinux: game.platforms.linux,
      headerImage: headerImage(game.steamAppid),
      capsuleImage: headerImage(game.steamAppid),
      website: null,
      appUrl: `https://store.steampowered.com/app/${game.steamAppid}/`,
      priceCurrency: 'PLN',
      priceFinalFormatted: game.priceFinalFormatted,
      priceInitialFormatted: game.priceFinalFormatted,
      priceDiscountPercent: game.priceDiscountPercent,
      reviewTier: game.reviewTier,
      pcMinimum: null,
      pcRecommended: null,
      macMinimum: null,
      macRecommended: null,
      linuxMinimum: null,
      linuxRecommended: null,
      genres: game.genres.map((name, index) => ({ id: String(index + 1), name })),
      categories: [],
      publishers: [],
      movies: [],
      screenshots: [],
    });
    return true;
  }

  // similar games: /api/game/similar?appId=&limit=
  if (key === 'GET /api/game/similar') {
    const appId = Number(url.searchParams.get('appId'));
    const limit = Number(url.searchParams.get('limit')) || 8;
    const items = CATALOG.filter((game) => game.steamAppid !== appId)
      .slice(0, limit)
      .map((game, index) => recommendationItem(game, Number((0.85 - index * 0.05).toFixed(4))));
    sendJson(res, 200, { items });
    return true;
  }

  // ratings mutations: persist in module memory
  if (pathname === '/api/user/me/ratings' && method === 'PUT') {
    const body = await readBody(req);
    const steamAppid = Number(body.steamAppid);
    const rating = Number(body.rating);
    MOCK_RATINGS.set(steamAppid, rating);
    sendJson(res, 200, { steamAppid, rating });
    return true;
  }

  if (pathname === '/api/user/me/ratings' && method === 'DELETE') {
    MOCK_RATINGS.clear();
    sendJson(res, 204, null);
    return true;
  }

  if (method === 'DELETE' && pathname.startsWith('/api/user/me/ratings/')) {
    MOCK_RATINGS.delete(Number(pathname.split('/').pop()));
    sendJson(res, 204, null);
    return true;
  }

  // PATCH /api/user/:userId (email/password change) and DELETE (account removal)
  if (pathname.startsWith('/api/user/') && (method === 'PATCH' || method === 'DELETE')) {
    sendJson(res, 200, { userId: pathname.split('/').pop(), steamId: '76561198000000001' });
    return true;
  }

  sendJson(res, 404, { message: `Not mocked: ${key}` });
  return true;
};

/** True when the request was answered by the mock (always, for /api/* requests). */
export const handleMockApiRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) {
    return false;
  }
  try {
    return await handleApi(req, res, url);
  } catch (error: unknown) {
    console.error('[mock-api] error handling', req.url, error);
    sendJson(res, 500, { message: 'Mock API error' });
    return true;
  }
};

export const mockApiPlugin = (): Plugin => ({
  name: 'cozagrac-mock-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      void handleMockApiRequest(req, res).then((handled) => {
        if (!handled) {
          next();
        }
      });
    });
  },
});
