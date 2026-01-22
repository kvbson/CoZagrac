import { getGameInfoByAppId } from '@/controllers/game.controller.js';
import { validate } from '@/middlewares/validate.js';
import { getGameInfoByAppIdHttpSchema } from '@/schemas/game.zod.js';
import { Router } from 'express';

const router = Router();

// GET /user?email= | ?steamId= | ?id=
router.get('/', validate(getGameInfoByAppIdHttpSchema), getGameInfoByAppId);

export default router;
