import { Request, Response } from 'express';
import {
  deleteAllUserRatingsHttpSchema,
  deleteUserRatingHttpSchema,
  putUserRatingHttpSchema,
} from '@cozagrac/shared/contracts/api';
import { getSessionUserId } from '../functions/setUserSession.js';
import { ratingsService } from '../services/ratings.service.js';

/* =========================
    USER GAME RATINGS (explicit feedback)
    One rating per (user, game): PUT upserts, DELETE clears, GET lists
    everything the UI needs to restore its state.
========================= */

export const getRatings = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  return res.json({ items: await ratingsService.getRatings(userId) });
};

export const putRating = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  const { steamAppid, rating } = putUserRatingHttpSchema.parse(req).body;

  if (!(await ratingsService.isKnownAppId(steamAppid))) {
    return res.status(422).json({ message: 'Game is not in our catalog.' });
  }

  await ratingsService.upsert(userId, steamAppid, rating);

  return res.status(200).json({ steamAppid, rating });
};

export const deleteRating = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  const { steamAppid } = deleteUserRatingHttpSchema.parse(req).params;

  await ratingsService.remove(userId, steamAppid);

  // idempotent: 204 regardless of whether the rating existed
  return res.sendStatus(204);
};

export const deleteAllRatings = async (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  deleteAllUserRatingsHttpSchema.parse(req);

  await ratingsService.removeAll(userId);

  return res.sendStatus(204);
};
