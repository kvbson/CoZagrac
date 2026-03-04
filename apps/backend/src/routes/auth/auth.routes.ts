import { Router } from 'express';
import { login, register } from '../../controllers/auth.controller.js';
import { loginUserHttpSchema } from '../../schemas/user.zod.js';
import { validate } from '../../utils/validate.js';
import steamRoutes from './steam/steam.routes.js';

const router = Router();

router.post('/register', validate(loginUserHttpSchema), register);
router.post('/login', validate(loginUserHttpSchema), login);
router.use('/', steamRoutes);

export default router;
