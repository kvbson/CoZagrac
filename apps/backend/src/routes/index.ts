import userRoutes from '@api/routes/user/user.routes.js';
import { Router } from 'express';
import gameRoutes from './game/game.routes.js';
import reviewRoutes from './review/review.routes.js';

const router = Router();

router.use('/user', userRoutes);
router.use('/game', gameRoutes);
router.use('/reviews', reviewRoutes);

export default router;
