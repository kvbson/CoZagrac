import { createUser, deleteUser, getUser, updateUser } from '@/controllers/users.controller.js';
import { validate } from '@/middlewares/validate.js';
import {
  createUserHttpSchema,
  deleteUserHttpSchema,
  getUserQueryHttpSchema,
  updateUserHttpSchema,
} from '@/schemas/user.http.js';
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
