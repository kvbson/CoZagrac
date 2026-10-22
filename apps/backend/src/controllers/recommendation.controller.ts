import { Request, Response } from 'express';
import {
  getUserRecommendationsHttpSchema,
  type UserEmbeddingStatusResponse,
} from '@cozagrac/shared/contracts/api';
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

export const regenerateUserEmbedding = (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  const current = embeddingJobs.get(userId);
  if (current?.status === 'running') {
    return res.status(200).json(current);
  }

  embeddingJobs.set(userId, { status: 'running' });

  void embeddingService.user
    .generateUserEmbedding(userId)
    .then((result) => {
      embeddingJobs.set(
        userId,
        result
          ? { status: 'done', gamesUsed: result.gamesUsed }
          : {
              status: 'failed',
              message:
                'Could not build your profile - Steam library is private/empty or game embeddings are missing.',
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
