import { setSessionUser } from '../functions/setUserSession.js';
import { LoginUserInput } from '../schemas/user.zod.js';
import { userService } from '../services/user.service.js';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';

/* =========================
   REGISTER (email + password)
========================= */

export const register = async (req: Request<object, object, LoginUserInput>, res: Response) => {
  const { email, password } = req.body;

  const existing = await userService.getByEmail(email);
  if (existing) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await userService.create({
    email,
    passwordHash,
  });

  setSessionUser(req, user.id);

  return res.status(201).json({ message: 'Registered' });
};

/* =========================
   LOGIN
========================= */

export const login = async (req: Request<object, object, LoginUserInput>, res: Response) => {
  const { email, password } = req.body;

  const user = await userService.getByEmail(email);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  setSessionUser(req, user.userId);

  return res.status(200).json({ message: 'Logged in' });
};
