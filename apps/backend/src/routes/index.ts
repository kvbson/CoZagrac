import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import gameRoutes from './game/game.routes.js';
import reviewRoutes from './review/review.routes.js';
import userRoutes from './user/user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/game', gameRoutes);
router.use('/reviews', reviewRoutes);

export default router;
