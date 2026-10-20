import { Router } from 'express';
import {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  me,
} from '../../controllers/users.controller.js';
import {
  getUserRecommendations,
  regenerateUserEmbedding,
} from '../../controllers/recommendation.controller.js';
import { requireAuth, requireSameUserParam } from '../../middlewares/requireAuth.js';
import { validate } from '../../utils/validate.js';
import {
  createUserHttpSchema,
  getUserHttpSchema,
  updateUserHttpSchema,
  deleteUserHttpSchema,
  getUserRecommendationsHttpSchema,
} from '@cozagrac/shared/contracts/api';

const router = Router();

// POST /user
router.post('/', requireAuth, validate(createUserHttpSchema), createUser);

// GET /user?email= | ?steamId= | ?id=
router.get('/', validate(getUserHttpSchema), getUser);

// PATCH /user/:userId
router.patch(
  '/:userId',
  requireAuth,
  requireSameUserParam('userId'),
  validate(updateUserHttpSchema),
  updateUser,
);

// DELETE /user/:userId
router.delete(
  '/:userId',
  requireAuth,
  requireSameUserParam('userId'),
  validate(deleteUserHttpSchema),
  deleteUser,
);

router.get('/me', requireAuth, me);

// GET /user/me/recommendations?limit=&cursor=
router.get(
  '/me/recommendations',
  requireAuth,
  validate(getUserRecommendationsHttpSchema),
  getUserRecommendations,
);

// POST /user/me/embedding - (re)build profile embedding from Steam library
router.post('/me/embedding', requireAuth, regenerateUserEmbedding);

export default router;
