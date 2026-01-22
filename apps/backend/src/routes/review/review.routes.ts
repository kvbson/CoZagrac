import { getGameReviews } from '@api/controllers/review.controller.js';
import { validate } from '@api/middlewares/validate.js';
import { getGameReviewsHttpSchema } from '@api/schemas/review.zod.js';
import { Router } from 'express';

const router = Router();

// GET /reviews/:steamAppid?page=&limit=&sort=
router.get('/:steamAppid', validate(getGameReviewsHttpSchema), getGameReviews);

export default router;
