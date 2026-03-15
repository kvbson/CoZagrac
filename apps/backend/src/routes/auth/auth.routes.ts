import { Router } from 'express';
import { login, logout, register } from '../../controllers/auth.controller.js';
import { validate } from '../../utils/validate.js';
import steamRoutes from './steam/steam.routes.js';
import { loginUserHttpSchema } from '@cozagrac/shared/contracts/api';
import { requireAuth } from '../../middlewares/requireAuth.js';

const router = Router();

router.post('/register', validate(loginUserHttpSchema), register);
router.post('/login', validate(loginUserHttpSchema), login);
router.post('/logout', requireAuth, logout);
router.use('/', steamRoutes);

export default router;
