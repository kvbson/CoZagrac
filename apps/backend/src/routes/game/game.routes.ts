import { Router } from 'express';
import { validate } from '../../utils/validate.js';
import { getGameInfoByAppId } from '../../controllers/game.controller.js';
import { getGameInfoByAppIdHttpSchema } from '../../schemas/game.zod.js';

const router = Router();

// GET /user?email= | ?steamId= | ?id=
router.get('/', validate(getGameInfoByAppIdHttpSchema), getGameInfoByAppId);

export default router;
