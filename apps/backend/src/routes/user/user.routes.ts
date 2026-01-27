import { Router } from 'express';
import { createUser, getUser, updateUser, deleteUser } from '../../controllers/users.controller.js';
import {
  createUserHttpSchema,
  getUserQueryHttpSchema,
  updateUserHttpSchema,
  deleteUserHttpSchema,
} from '../../schemas/user.zod.js';
import { validate } from '../../utils/validate.js';

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
