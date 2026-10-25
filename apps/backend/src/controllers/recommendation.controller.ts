import { Request, Response } from 'express';
import {
  buildUserEmbeddingHttpSchema,
  getUserRecommendationsHttpSchema,
  MIN_FAVORITE_GAMES,
  type UserEmbeddingStatusResponse,
} from '@cozagrac/shared/contracts/api';
import { env } from '../env.js';
import { userService } from '../services/user.service.js';
import { usageService } from '../services/usage.service.js';
import { favoritesService } from '../services/favorites.service.js';
import { getSessionUserId } from '../functions/setUserSession.js';
import { embeddingService } from '../services/embeddings.service.js';

/* =========================
   GET RECOMMENDATIONS
========================= */

export const getUserRecommendations = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  const { limit, cursor, ...filters } = getUserRecommendationsHttpSchema.parse(req).query;

  const result = await embeddingService.user.recommendForUser(userId, {
    limit,
    cursor,
    ...filters,
  });

  if (!result) {
    // brak profilu (embeddingu) użytkownika - frontend pokaże CTA "zbuduj profil"
    return res.status(200).json({ items: [], nextCursor: null, hasEmbedding: false });
  }

  return res.status(200).json({ ...result, hasEmbedding: true });
};

/* =========================
   REGENERATE USER EMBEDDING (async job)
   Building the profile is slow (Steam API + OpenAI + centroid), which used
   to hit server.timeout on big libraries. POST starts the job and answers
   202 immediately; the client polls GET /user/me/embedding/status.
   The job store is in-memory: a server restart clears statuses and clients
   see 'idle' - they treat it as "no job in progress", not as an error.
========================= */

const embeddingJobs = new Map<string, UserEmbeddingStatusResponse>();

export const regenerateUserEmbedding = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  const { source } = buildUserEmbeddingHttpSchema.parse(req).body;

  // cheap pre-checks so the wizard gets an instant, actionable error
  // instead of a job that fails after a minute
  if (source === 'manual-games') {
    const favoriteCount = (await favoritesService.getAppIds(userId)).length;
    if (favoriteCount < MIN_FAVORITE_GAMES) {
      return res.status(400).json({
        message: `Select at least ${MIN_FAVORITE_GAMES} of your games first - you picked ${favoriteCount}.`,
      });
    }
  } else {
    const profile = await userService.getById(userId);
    if (!profile?.steamId) {
      return res
        .status(400)
        .json({ message: 'This account has no linked Steam profile. Pick games yourself instead.' });
    }
  }

  // dzienne limity: buildy (oba źródła, chronią Steam API i kolejki jobów)
  // oraz budżet tokenów OpenAI (tylko manual-games generuje embeddingi)
  if (await usageService.buildsProblem(userId)) {
    return res.status(429).json({
      message: `You have used all ${env.USER_PROFILE_BUILDS_PER_DAY} profile rebuilds today. Try again tomorrow.`,
    });
  }

  if (source === 'manual-games' && (await usageService.tokenBudgetProblem(userId))) {
    return res
      .status(429)
      .json({ message: 'Daily AI quota for your account is exhausted. Try again tomorrow.' });
  }

  const current = embeddingJobs.get(userId);
  if (current?.status === 'running') {
    return res.status(200).json(current);
  }

  embeddingJobs.set(userId, { status: 'running' });
  // liczone przed startem - crash/retry joba nie oddaje limitu
  await usageService.incrementBuilds(userId);

  void embeddingService.user
    .generateUserEmbedding(userId, source)
    .then((result) => {
      const quotaReached = result && 'quotaReached' in result ? result.quotaReached : false;

      if (result && quotaReached && result.gamesUsed === 0) {
        embeddingJobs.set(userId, {
          status: 'failed',
          message:
            'Daily AI quota reached before any of your games could be embedded. Try again tomorrow.',
        });
        return;
      }

      embeddingJobs.set(
        userId,
        result
          ? {
              status: 'done',
              gamesUsed: result.gamesUsed,
              source,
              ...(quotaReached
                ? {
                    message:
                      'Daily AI quota reached - profile built from fewer games than expected.',
                  }
                : {}),
            }
          : {
              status: 'failed',
              message:
                source === 'manual-games'
                  ? 'Could not build your profile - none of your games have embeddings yet (no reviews/description in our catalog).'
                  : 'Could not build your profile - Steam library is private/empty or game embeddings are missing.',
            },
      );
    })
    .catch((err: unknown) => {
      console.error('[EMBEDDING][JOB] failed:', err);
      embeddingJobs.set(userId, {
        status: 'failed',
        message: 'Internal error while building your profile.',
      });
    });

  return res.status(202).json({ status: 'running' } satisfies UserEmbeddingStatusResponse);
};

export const getUserEmbeddingStatus = (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  return res.json(embeddingJobs.get(userId) ?? { status: 'idle' });
};
