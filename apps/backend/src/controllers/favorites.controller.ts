import { Request, Response } from 'express';
import {
  MIN_FAVORITE_GAMES,
  setUserFavoritesHttpSchema,
} from '@cozagrac/shared/contracts/api';
import { getSessionUserId } from '../functions/setUserSession.js';
import { favoritesService } from '../services/favorites.service.js';

/* =========================
    USER FAVORITE GAMES (manual profile basis)
   The set is saved as a whole (PUT replace): the wizard holds the full
   selection locally and syncs it before starting a manual-games build.
========================= */

export const getFavorites = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  return res.json({ items: await favoritesService.getFavorites(userId) });
};

export const setFavorites = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  const appIds = setUserFavoritesHttpSchema.parse(req).body.appIds;
  const knownIds = await favoritesService.getKnownAppIds(appIds);

  if (knownIds.length < MIN_FAVORITE_GAMES) {
    // reject before touching the previously saved set
    return res.status(422).json({
      message: `Only ${knownIds.length} of your ${appIds.length} picks are in our catalog - at least ${MIN_FAVORITE_GAMES} are required.`,
    });
  }

  await favoritesService.replace(userId, knownIds);

  return res.status(200).json({ items: await favoritesService.getFavorites(userId) });
};
