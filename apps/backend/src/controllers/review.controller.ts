import { Request, Response } from 'express';
import { getGameReviewsHttpSchema } from '../schemas/review.zod.js';
import { reviewService } from '../services/review.service.js';

export const getGameReviews = async (req: Request, res: Response) => {
  const { params, query } = getGameReviewsHttpSchema.parse(req);

  const { steamAppid } = params;
  const { page, limit, sort } = query;

  const result = await reviewService.getByGame(steamAppid, page, limit, sort);

  if (!result || !result.items.length) {
    res.sendStatus(404);
  }

  res.status(200).json(result);
};
