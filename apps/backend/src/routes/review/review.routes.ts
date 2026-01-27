import { Router } from 'express';
import { getGameReviews } from '../../controllers/review.controller.js';
import { getGameReviewsHttpSchema } from '../../schemas/review.zod.js';
import { validate } from '../../utils/validate.js';

const router = Router();

// GET /reviews/:steamAppid?page=&limit=&sort=
router.get('/:steamAppid', validate(getGameReviewsHttpSchema), getGameReviews);

export default router;
