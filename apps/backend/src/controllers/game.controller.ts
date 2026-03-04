import { Request, Response } from 'express';
import { getGameInfoByAppIdHttpSchema } from '../schemas/game.zod.js';
import { gameService } from '../services/game.service.js';

export const getGameInfoByAppId = async (req: Request, res: Response) => {
  const { query } = getGameInfoByAppIdHttpSchema.parse(req);

  const { appId } = query;

  const game = await gameService.getByAppId(appId);

  if (!game) {
    return res.sendStatus(404);
  }

  res.status(200).json(game);
};
