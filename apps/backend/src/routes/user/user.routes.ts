import { Router } from 'express';
import {
  createUser,
  getUser,
  getUserLibrary,
  updateUser,
  deleteUser,
  me,
} from '../../controllers/users.controller.js';
import {
  getUserRecommendations,
  getUserEmbeddingStatus,
  regenerateUserEmbedding,
} from '../../controllers/recommendation.controller.js';
import { getFavorites, setFavorites } from '../../controllers/favorites.controller.js';
import { requireAuth, requireSameUserParam } from '../../middlewares/requireAuth.js';
import { validate } from '../../utils/validate.js';
import {
  buildUserEmbeddingHttpSchema,
  createUserHttpSchema,
  getUserHttpSchema,
  updateUserHttpSchema,
  deleteUserHttpSchema,
  getUserRecommendationsHttpSchema,
  setUserFavoritesHttpSchema,
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

// GET /user/me/library - Steam library with playtime, enriched with catalog images
router.get('/me/library', requireAuth, getUserLibrary);

// GET /user/me/recommendations?limit=&cursor=&isFree=&minDiscount=&minReviewTier=&yearFrom=&platform=
router.get(
  '/me/recommendations',
  requireAuth,
  validate(getUserRecommendationsHttpSchema),
  getUserRecommendations,
);

// GET /user/me/favorites - manual profile basis (user-picked games)
router.get('/me/favorites', requireAuth, getFavorites);

// PUT /user/me/favorites - replace the whole favorite set
router.put(
  '/me/favorites',
  requireAuth,
  validate(setUserFavoritesHttpSchema),
  setFavorites,
);

// POST /user/me/embedding - start (re)building profile embedding (async job, 202)
router.post(
  '/me/embedding',
  requireAuth,
  validate(buildUserEmbeddingHttpSchema),
  regenerateUserEmbedding,
);

// GET /user/me/embedding/status - poll embedding job status
router.get('/me/embedding/status', requireAuth, getUserEmbeddingStatus);

export default router;
