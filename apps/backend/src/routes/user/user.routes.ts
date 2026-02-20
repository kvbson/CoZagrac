import { Router } from 'express';
import { createUser, getUser, updateUser, deleteUser } from '../../controllers/users.controller.js';
import {
  createUserHttpSchema,
  getUserHttpSchema,
  updateUserHttpSchema,
  deleteUserHttpSchema,
} from '../../schemas/user.zod.js';
import { requireAuth, requireSameUserParam } from '../../middlewares/requireAuth.js';
import { validate } from '../../utils/validate.js';

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

export default router;
