import gameRoutes from '@/routes/game/game.routes.js';
import reviewRoutes from '@/routes/review/review.routes.js';
import userRoutes from '@/routes/user/user.routes.js';
import { Router } from 'express';

const router = Router();

router.use('/user', userRoutes);
router.use('/game', gameRoutes);
router.use('/reviews', reviewRoutes);

export default router;
