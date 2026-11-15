/**
 * Leave-one-out evaluation of the recommendation engine (rozdz. 6.3 pracy).
 *
 * Protocol per test profile (real Steam account with steamLinked):
 *   1. fetch owned games with playtime from Steam (live, like the build),
 *   2. keep games with playtime >= MIN_PLAYTIME that have a catalog embedding
 *      (the production top-50 slice by playtime),
 *   3. for every held-out game T (top TEST_GAMES, excluding favorites/rated):
 *        - compute the weighted centroid LOCALLY WITHOUT T (same weights as
 *          the production build -> no self-leakage),
 *        - run the PRODUCTION kNN path via recommendForUser({ embeddingOverride }),
 *        - record T's rank in the top-20,
 *   4. aggregate Hit Rate@K, MRR, NDCG@10.
 *
 * Explicit-feedback variant (runs when a profile has enough 1-5 ratings):
 * ratings are split 80/20; the centroid is corrected with the TRAIN split
 * only (applyRatingCorrection, like the engine) and ranks of the TEST games
 * are measured (they must stay among candidates -> excludeRated: false).
 *
 * Run from apps/backend (needs .env + DB + STEAM_API_KEY):
 *   npx tsx src/functions/evaluation/evaluateLeaveOneOut.ts [steamId ...]
 * Without args: every user with a linked Steam provider.
 * Results: docs/pomiary/leave-one-out-<date>.md
 */
import { inArray } from 'drizzle-orm';
import {
  hitRateAtK,
  mean,
  meanNdcgAtK,
} from '../../utils/evaluation.helpers.js';
import { applyRatingCorrection, profileWeight } from '../../utils/rating.helpers.js';
import { l2Normalize, weightedMean } from '../../utils/embedding.helpers.js';
import { embeddingService, USER_LIMITS } from '../../services/embeddings.service.js';
import { favoritesService } from '../../services/favorites.service.js';
import { ratingsService } from '../../services/ratings.service.js';
import { ownedGamesEndpoint } from '../../clients/steam/endpoints/userContext/ownedGames.endpoint.js';
import { db } from '../../db/init.js';
import { gameEmbeddings, userProviders } from '../../drizzle/schema.js';
import { writeReport } from './report.js';

const MIN_PLAYTIME = 60; // minutes - "bought and played 5 min" is noise
const TEST_GAMES = 20; // held-out games per profile
const K_LIST = [1, 5, 10, 20];
const EXPLICIT_MIN_RATINGS = 10;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

type Profile = { userId: string; steamId: string };
type Candidate = { playtime: number; embedding: number[] };

type ProfileData = {
  profile: Profile;
  /** production top-50 slice by playtime, with catalog embeddings */
  candidates: Map<number, Candidate>;
  ratingByAppid: Map<number, number>;
  /** games the engine excludes from results (favorites + rated) */
  excluded: Set<number>;
  /** held-out appids (subset of candidates) */
  testGames: number[];
};

async function loadProfiles(steamIdFilter: string[]): Promise<Profile[]> {
  const rows = await db
    .select({ userId: userProviders.userId, steamId: userProviders.providerUserId })
    .from(userProviders);

  return rows.filter((row) => steamIdFilter.length === 0 || steamIdFilter.includes(row.steamId));
}

async function embeddingsFor(appids: number[]): Promise<Map<number, number[]>> {
  if (appids.length === 0) return new Map();
  const rows = await db
    .select({ steamAppid: gameEmbeddings.steamAppid, embedding: gameEmbeddings.embedding })
    .from(gameEmbeddings)
    .where(inArray(gameEmbeddings.steamAppid, appids));
  return new Map(rows.map((r) => [r.steamAppid, r.embedding]));
}

async function loadProfileData(profile: Profile): Promise<ProfileData | null> {
  const { response } = await ownedGamesEndpoint.getData(profile.steamId);
  const owned = response?.games ?? [];

  const sorted = [...owned]
    .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
    .slice(0, USER_LIMITS.MAX_GAMES_FOR_USER); // mirror the production top-50 slice

  const embByAppid = await embeddingsFor(sorted.map((g) => g.appid));

  const favoriteIds = new Set(await favoritesService.getAppIds(profile.userId));
  const ratedIds = new Set(await ratingsService.getRatedAppIds(profile.userId));
  const ratingByAppid = await ratingsService.getRatingMap(profile.userId);

  const candidates = new Map<number, Candidate>();
  for (const game of sorted) {
    const embedding = embByAppid.get(game.appid);
    if (embedding) {
      candidates.set(game.appid, { playtime: game.playtime_forever ?? 0, embedding });
    }
  }

  // never hold out a game the engine would exclude from results anyway
  const testGames = [...candidates.entries()]
    .filter(
      ([appid, candidate]) =>
        candidate.playtime >= MIN_PLAYTIME && !favoriteIds.has(appid) && !ratedIds.has(appid),
    )
    .sort((a, b) => b[1].playtime - a[1].playtime)
    .slice(0, TEST_GAMES)
    .map(([appid]) => appid);

  if (testGames.length === 0) return null;

  return { profile, candidates, ratingByAppid, excluded: new Set([...favoriteIds, ...ratedIds]), testGames };
}

/** production-build centroid computed WITHOUT the held-out game */
function centroidWithout(data: ProfileData, heldOut: number): number[] {
  const items: { vec: number[]; weight: number }[] = [];
  for (const [appid, candidate] of data.candidates) {
    if (appid === heldOut) continue;
    items.push({
      vec: candidate.embedding,
      weight: profileWeight(candidate.playtime, data.ratingByAppid.get(appid)),
    });
  }
  return l2Normalize(weightedMean(items));
}

/** rank of `appid` in the production kNN result (null = beyond the list) */
async function rankOf(
  data: ProfileData,
  vector: number[],
  appid: number,
  excludeRated = true,
): Promise<number | null> {
  const result = await embeddingService.user.recommendForUser(data.profile.userId, {
    limit: 20,
    embeddingOverride: vector,
    excludeRated,
  });
  const position = result?.items.findIndex((item) => item.steamAppid === appid) ?? -1;
  return position === -1 ? null : position + 1;
}

async function evaluateLeaveOneOut(data: ProfileData): Promise<(number | null)[]> {
  const ranks: (number | null)[] = [];
  for (const [index, testGame] of data.testGames.entries()) {
    const centroid = centroidWithout(data, testGame);
    ranks.push(await rankOf(data, centroid, testGame));
    console.log(`[EVAL]   ${index + 1}/${data.testGames.length} appid ${testGame} -> rank ${ranks[ranks.length - 1] ?? '>20'}`);
  }
  return ranks;
}

/** deterministic 80/20 split of a user's ratings (every 5th -> test) */
function splitRatings(ratingByAppid: Map<number, number>, candidates: Set<number>) {
  const train: [number, number][] = [];
  const test: number[] = [];
  let index = 0;
  for (const [appid, rating] of ratingByAppid) {
    if (index++ % 5 === 4) {
      if (candidates.has(appid)) test.push(appid);
    } else {
      train.push([appid, rating]);
    }
  }
  return { train, test };
}

async function evaluateExplicit(data: ProfileData): Promise<(number | null)[] | null> {
  if (data.ratingByAppid.size < EXPLICIT_MIN_RATINGS) return null;

  const { train, test } = splitRatings(data.ratingByAppid, new Set(data.candidates.keys()));
  if (test.length === 0) return null;

  const trainEmbeddings = await embeddingsFor(train.map(([appid]) => appid));

  // base centroid: production weights, WITHOUT any test item (no self-leakage)
  const baseItems: { vec: number[]; weight: number }[] = [];
  for (const [appid, candidate] of data.candidates) {
    if (test.includes(appid)) continue;
    baseItems.push({
      vec: candidate.embedding,
      weight: profileWeight(candidate.playtime, data.ratingByAppid.get(appid)),
    });
  }
  const base = l2Normalize(weightedMean(baseItems));

  // Rocchio correction from the TRAIN ratings only (same as the engine)
  const rated = train
    .filter(([appid]) => trainEmbeddings.has(appid))
    .map(([appid, rating]) => ({ vec: trainEmbeddings.get(appid)!, rating }));
  const vector = applyRatingCorrection(base, rated);

  const ranks: (number | null)[] = [];
  for (const [index, testGame] of test.entries()) {
    // test games are rated, but must stay among candidates -> excludeRated: false
    ranks.push(await rankOf(data, vector, testGame, false));
    console.log(`[EVAL]   explicit ${index + 1}/${test.length} appid ${testGame} -> rank ${ranks[ranks.length - 1] ?? '>20'}`);
  }
  return ranks;
}

const mdTable = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

function metricsSection(title: string, ranks: (number | null)[]): string {
  const rows = [
    ...K_LIST.map((k) => [`HR@${k}`, pct(hitRateAtK(ranks, k))]),
    ['MRR', mean(ranks.map((r) => (r === null ? 0 : 1 / r))).toFixed(3)],
    ['NDCG@10', meanNdcgAtK(ranks, 10).toFixed(3)],
    ['queries', ranks.length],
  ];
  return `### ${title}\n\n${mdTable(['Metric', 'Value'], rows)}`;
}

async function main() {
  const filter = process.argv.slice(2);
  const profiles = await loadProfiles(filter);

  if (profiles.length === 0) {
    console.log('[EVAL] No steam-linked users found (pass steamIds as args).');
    return;
  }
  console.log(`[EVAL] Profiles: ${profiles.length}`);

  const sections: string[] = [];

  for (const profile of profiles) {
    console.log(`[EVAL] profile ${profile.steamId} - loading owned games…`);
    const data = await loadProfileData(profile);
    if (!data) {
      sections.push(`## ${profile.steamId}\n\nInsufficient data (no catalog games with playtime >= ${MIN_PLAYTIME} min).\n`);
      continue;
    }

    const looRanks = await evaluateLeaveOneOut(data);
    const parts = [`## ${profile.steamId} (${data.testGames.length} held-out games)`, metricsSection('Leave-one-out', looRanks)];

    const explicitRanks = await evaluateExplicit(data);
    parts.push(
      explicitRanks === null
        ? `### Explicit ratings (80/20)\n\nSkipped - fewer than ${EXPLICIT_MIN_RATINGS} catalog-rated games.`
        : metricsSection(`Explicit ratings 80/20 (${explicitRanks.length} test games)`, explicitRanks),
    );

    sections.push(parts.join('\n\n'));
  }

  const markdown =
    `# Leave-one-out + explicit-feedback evaluation (${new Date().toISOString().slice(0, 10)})\n\n` +
    `Method (leave-one-out): for every held-out game T (playtime >= ${MIN_PLAYTIME} min, top ${TEST_GAMES} ` +
    `by playtime, favorites/rated excluded) the weighted centroid is computed WITHOUT T ` +
    `(production weights: (1+log1p(playtime)) x rating/3) and the PRODUCTION kNN path runs with that vector; ` +
    `T's rank in the top-20 is recorded.\n\n` +
    `Method (explicit 80/20): ratings split 80/20, centroid corrected with the train split only ` +
    `(Rocchio, as the engine), ranks of test-rated games measured (rated games kept among candidates).\n\n` +
    sections.join('\n\n');

  await writeReport('leave-one-out', markdown);
  await db.$client.end?.();
}

main().catch((err) => {
  console.error('[EVAL] failed:', err);
  process.exit(1);
});
