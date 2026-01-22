import { getGameInfoByAppId } from '@api/controllers/game.controller.js';
import { validate } from '@api/middlewares/validate.js';
import { getGameInfoByAppIdHttpSchema } from '@api/schemas/game.zod.js';
import { Router } from 'express';

const router = Router();

// GET /user?email= | ?steamId= | ?id=
router.get('/', validate(getGameInfoByAppIdHttpSchema), getGameInfoByAppId);

export default router;
