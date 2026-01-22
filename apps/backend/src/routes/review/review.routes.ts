import { getGameReviews } from '@/controllers/review.controller.js';
import { validate } from '@/middlewares/validate.js';
import { getGameReviewsHttpSchema } from '@/schemas/review.http.js';
import { Router } from 'express';

const router = Router();

// GET /reviews/:steamAppid?page=&limit=&sort=
router.get('/:steamAppid', validate(getGameReviewsHttpSchema), getGameReviews);

export default router;
