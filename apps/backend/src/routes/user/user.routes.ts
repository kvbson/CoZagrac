import { createUser, deleteUser, getUser, updateUser } from '@api/controllers/users.controller.js';
import { validate } from '@api/middlewares/validate.js';
import {
  createUserHttpSchema,
  deleteUserHttpSchema,
  getUserQueryHttpSchema,
  updateUserHttpSchema,
} from '@api/schemas/user.zod.js';
import { Router } from 'express';

const router = Router();

// POST /user
router.post('/', validate(createUserHttpSchema), createUser);

// GET /user?email= | ?steamId= | ?id=
router.get('/', validate(getUserQueryHttpSchema), getUser);

// PATCH /user/:userId
router.patch('/:userId', validate(updateUserHttpSchema), updateUser);

// DELETE /user/:userId
router.delete('/:userId', validate(deleteUserHttpSchema), deleteUser);

export default router;
