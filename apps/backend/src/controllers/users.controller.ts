import {
  CreateUserInput,
  DeleteUserParams,
  GetUserQuery,
  UpdateUserBody,
  UpdateUserParams,
} from '@api/schemas/user.zod.js';
import { userService } from '@api/services/user.service.js';
import { Request, Response } from 'express';

export const createUser = async (req: Request<object, object, CreateUserInput>, res: Response) => {
  const user = await userService.create(req.body);
  res.status(201).json(user);
};

export const updateUser = async (
  req: Request<UpdateUserParams, object, UpdateUserBody>,
  res: Response,
) => {
  const user = await userService.update(req.params.userId, req.body);

  if (!user.userId) {
    return res.sendStatus(404);
  }

  res.status(201).json(user);
};

export const deleteUser = async (req: Request<DeleteUserParams>, res: Response) => {
  const deleted = await userService.delete(req.params.id);

  if (!deleted) {
    return res.sendStatus(404);
  }

  res.sendStatus(200);
};

export const getUser = async (
  req: Request<object, object, object, GetUserQuery>,
  res: Response,
) => {
  const { id, email, steamId } = req.query;

  const user = id
    ? await userService.getById(id)
    : email
      ? await userService.getByEmail(email)
      : await userService.getBySteamId(steamId!);

  if (!user.userId) {
    return res.sendStatus(404);
  }

  res.status(200).json(user);
};
