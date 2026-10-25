import { Request, Response } from 'express';
import { getGameReviewsHttpSchema } from '../schemas/review.zod.js';
import { reviewService } from '../services/review.service.js';

export const getGameReviews = async (req: Request, res: Response) => {
  const { params, query } = getGameReviewsHttpSchema.parse(req);

  const { steamAppid } = params;
  const { page, limit, sort, language } = query;

  const result = await reviewService.getByGame(steamAppid, page, limit, sort, language);

  if (!result || !result.items.length) {
    return res.sendStatus(404);
  }

  return res.status(200).json(result);
};
