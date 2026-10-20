import { Request, Response } from 'express';
import { getUserRecommendationsHttpSchema } from '@cozagrac/shared/contracts/api';
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

  const { limit, cursor } = getUserRecommendationsHttpSchema.parse(req).query;

  const result = await embeddingService.user.recommendForUser(userId, { limit, cursor });

  if (!result) {
    // brak profilu (embeddingu) użytkownika - frontend pokaże CTA "zbuduj profil"
    return res.status(200).json({ items: [], nextCursor: null, hasEmbedding: false });
  }

  return res.status(200).json({ ...result, hasEmbedding: true });
};

/* =========================
   REGENERATE USER EMBEDDING
========================= */

export const regenerateUserEmbedding = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  const result = await embeddingService.user.generateUserEmbedding(userId);

  if (!result) {
    return res.status(422).json({
      message:
        'Nie udało się zbudować profilu — biblioteka Steam jest prywatna/pusta lub brakuje embeddingów gier.',
    });
  }

  return res.status(201).json({ gamesUsed: result.gamesUsed });
};
