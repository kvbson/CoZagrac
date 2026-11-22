import { Router } from 'express';
import { getGameSearchHttpSchema } from '@cozagrac/shared/contracts/api';
import { validate } from '../../utils/validate.js';
import {
  getGameInfoByAppId,
  getSimilarGames,
  getGameTaxonomy,
  searchGames,
} from '../../controllers/game.controller.js';
import { getGameInfoByAppIdHttpSchema, getSimilarGamesHttpSchema } from '../../schemas/game.zod.js';

const router = Router();

// GET /game?appId=
router.get('/', validate(getGameInfoByAppIdHttpSchema), getGameInfoByAppId);

// GET /game/search?q=&limit= (full text)
router.get('/search', validate(getGameSearchHttpSchema), searchGames);

// GET /game/similar?appId=&limit=
router.get('/similar', validate(getSimilarGamesHttpSchema), getSimilarGames);

// GET /game/taxonomy - genre facets with game counts (recommendation filter options)
router.get('/taxonomy', getGameTaxonomy);

export default router;
