import { getGameInfoByAppIdHttpSchema } from '@/schemas/game.http.js';
import { gameService } from '@/services/game.service.js';
import { Request, Response } from 'express';

export const getGameInfoByAppId = async (req: Request, res: Response) => {
  const { query } = getGameInfoByAppIdHttpSchema.parse(req);

  const { appId } = query;

  const game = await gameService.getByAppId(appId);

  if (!game) {
    return res.sendStatus(404);
  }

  res.status(200).json(game);
};
