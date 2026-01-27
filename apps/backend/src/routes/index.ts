import { Router } from 'express';
import gameRoutes from './game/game.routes.js';
import reviewRoutes from './review/review.routes.js';
import userRoutes from './user/user.routes.js';

const router = Router();

router.use('/user', userRoutes);
router.use('/game', gameRoutes);
router.use('/reviews', reviewRoutes);

export default router;
