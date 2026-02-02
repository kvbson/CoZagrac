import {
  appReviewsEndpoint,
  mapAppReviewsToCreateReviewInput,
} from '../clients/steam/endpoints/global/appReviews.endpoint.js';
import { gameService } from '../services/game.service.js';
import { reviewService } from '../services/review.service.js';
import { cleanSteamBBCode } from '../utils/clearSteamBBCode.js';
import { logger } from '../utils/logger.js';
import { shouldSkipReview } from '../utils/shouldSkipReview.js';
import { steamRequest } from '../utils/steamRequest.js';

type FetchReviewsConfig = {
  appId: number;
  reviewType: 'all' | 'positive' | 'negative';
  maxReviews: number; // ile MAKSYMALNIE chcemy zapisać
  textSize?: {
    min: number;
    max: number;
  };
};

export async function fetchAndSyncReviewsForGame({
  appId,
  reviewType,
  maxReviews,
  textSize = { min: 0, max: Infinity },
}: FetchReviewsConfig) {
  let savedTotal = 0;
  let cursor: string | undefined;
  let pageCount = 0;
  let emptyPages = 0;

  const MAX_PAGES = 40;
  const MAX_EMPTY_PAGES = 5;

  // DB = source of truth
  const existingIds = await reviewService.getRecommendationIdsForGame(appId);
  const seen = new Set(existingIds.map(String));

  logger.info(`[START] appId=${appId} reviewType=${reviewType} max=${maxReviews}`);

  while (savedTotal < maxReviews) {
    const res = await steamRequest(() =>
      appReviewsEndpoint.getData({
        appId: String(appId),
        reviewType,
        cursor,
      }),
    );

    if (res.success !== 1 || res.reviews.length === 0) {
      logger.info(`[STOP] no more data from Steam`);
      break;
    }

    const prevCursor = cursor;
    cursor = res.cursor;

    if (!cursor || cursor === prevCursor) {
      logger.info(`[STOP] cursor did not advance`);
      break;
    }

    pageCount++;

    const cleaned = res.reviews.map((r) => ({
      ...r,
      review: cleanSteamBBCode(r.review),
    }));

    const filtered = cleaned.filter((r) => {
      if (shouldSkipReview(r.review)) return false;

      if (r.review.length < textSize.min || r.review.length > textSize.max) {
        return false;
      }
      return !seen.has(r.recommendationid);
    });

    logger.info(`[PAGE ${pageCount}] raw=${res.reviews.length} filtered=${filtered.length}`);

    if (filtered.length === 0) {
      emptyPages++;

      if (emptyPages >= MAX_EMPTY_PAGES) {
        logger.info(`[STOP] ${MAX_EMPTY_PAGES} empty pages in a row`);
        break;
      }

      continue;
    }

    emptyPages = 0;

    const sliced = filtered.slice(0, maxReviews - savedTotal);

    const mapped = mapAppReviewsToCreateReviewInput(sliced, appId);

    const { savedPositive, savedNegative } = await reviewService.syncForGame(appId, mapped);

    const savedNow = savedPositive + savedNegative;
    savedTotal += savedNow;

    for (const r of mapped) {
      seen.add(String(r.recommendationId));
    }

    logger.info(`[SAVE] +${savedNow} (total ${savedTotal}/${maxReviews})`);

    if (savedNow === 0) {
      logger.info(`[STOP] no DB progress`);
      break;
    }

    if (pageCount >= MAX_PAGES) {
      logger.info(`[STOP] reached max pages ${MAX_PAGES}`);
      break;
    }
  }

  logger.info(`[DONE] appId=${appId} reviewType=${reviewType} saved=${savedTotal}`);

  return { savedTotal };
}

type SyncAllGamesConfig = {
  reviewCountForGame?: number;
  positivePercentageThreshold?: number;
  textSize?: {
    min: number;
    max: number;
  };
  startAfterAppId?: number;
};

export async function syncReviewsForAllGames({
  reviewCountForGame = 300,
  positivePercentageThreshold = 60,
  textSize = { min: 100, max: 4000 },
  startAfterAppId,
}: SyncAllGamesConfig) {
  const appIds = await gameService.getAllAppIds();
  const startIndex = startAfterAppId ? appIds.indexOf(startAfterAppId) : -1;

  const slicedAppIds = startIndex === -1 ? appIds : appIds.slice(startIndex);
  for (const appId of slicedAppIds) {
    logger.info(`=== Sync start for appId ${appId} ===`);

    const positiveTarget = Math.floor(reviewCountForGame * (positivePercentageThreshold / 100));
    const negativeTarget = reviewCountForGame - positiveTarget;

    /* ================= POSITIVE ================= */

    const positiveStrict = await fetchAndSyncReviewsForGame({
      appId,
      reviewType: 'positive',
      maxReviews: positiveTarget,
      textSize,
    });

    // fallback
    if (positiveStrict.savedTotal < positiveTarget) {
      const remainingPositive = positiveTarget - positiveStrict.savedTotal;

      logger.info(`[FALLBACK] appId=${appId} positive remaining=${remainingPositive}`);

      if (remainingPositive > 0) {
        await fetchAndSyncReviewsForGame({
          appId,
          reviewType: 'positive',
          maxReviews: remainingPositive,
          textSize: { min: 0, max: textSize.max },
        });
      }
    }

    /* ================= NEGATIVE ================= */
    const negativeStrict = await fetchAndSyncReviewsForGame({
      appId,
      reviewType: 'negative',
      maxReviews: negativeTarget,
      textSize,
    });

    if (negativeStrict.savedTotal < negativeTarget) {
      const remainingNegative = negativeTarget - negativeStrict.savedTotal;

      logger.info(`[FALLBACK] appId=${appId} negative remaining=${remainingNegative}`);

      if (remainingNegative > 0) {
        await fetchAndSyncReviewsForGame({
          appId,
          reviewType: 'negative',
          maxReviews: remainingNegative,
          textSize: { min: 0, max: textSize.max },
        });
      }
    }
    logger.checkpoint(appId);
    logger.info(`=== Sync done for appId ${appId} ===`);
  }
}
