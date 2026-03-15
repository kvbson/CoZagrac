import { Request, Response } from 'express';
import {
  CreateUserInputWithHash,
  DeleteUserParams,
  GetUserQuery,
  UpdateUserBody,
  UpdateUserParams,
} from '@cozagrac/shared/contracts/api';
import { userService } from '../services/user.service.js';
import { getSessionUserId } from '../functions/setUserSession.js';
import { hashPassword } from '../utils/hash.js';

/* =========================
   CREATE
========================= */

export const createUser = async (
  req: Request<object, object, CreateUserInputWithHash>,
  res: Response,
) => {
  const user = await userService.create(req.body);
  return res.status(201).json(user);
};

/* =========================
   UPDATE
========================= */

export const updateUser = async (
  req: Request<UpdateUserParams, object, UpdateUserBody>,
  res: Response,
) => {
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: 'No data provided for update' });
  }
  let passwordHash: string | undefined;
  if (req.body.password) {
    passwordHash = await hashPassword(req.body.password);
  }
  const user = await userService.update(req.params.userId, { ...req.body, passwordHash });

  if (!user) {
    return res.sendStatus(404);
  }

  return res.status(200).json(user);
};

/* =========================
   DELETE
========================= */

export const deleteUser = async (req: Request<DeleteUserParams>, res: Response) => {
  const deleted = await userService.delete(req.params.userId);

  if (!deleted) {
    return res.sendStatus(404);
  }

  return res.sendStatus(204);
};

/* =========================
   GET
========================= */

export const getUser = async (
  req: Request<object, object, object, GetUserQuery>,
  res: Response,
) => {
  const { id, email, steamId } = req.query;

  let user = null;

  if (id) {
    user = await userService.getById(id);
  } else if (email) {
    user = await userService.getByEmail(email);
  } else if (steamId) {
    user = await userService.getBySteamId(steamId);
  } else {
    return res.status(400).json({ message: 'Missing query parameter' });
  }

  if (!user) {
    return res.sendStatus(404);
  }

  return res.status(200).json(user);
};

/* =========================
   CHECK USER SESSION
========================= */

export const me = (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  res.json({ userId });
};
