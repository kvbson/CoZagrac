import { Router } from 'express';
import { validate } from '../../utils/validate.js';
import { getGameInfoByAppId, getSimilarGames } from '../../controllers/game.controller.js';
import { getGameInfoByAppIdHttpSchema, getSimilarGamesHttpSchema } from '../../schemas/game.zod.js';

const router = Router();

// GET /game?appId=
router.get('/', validate(getGameInfoByAppIdHttpSchema), getGameInfoByAppId);

// GET /game/similar?appId=&limit=
router.get('/similar', validate(getSimilarGamesHttpSchema), getSimilarGames);

export default router;
