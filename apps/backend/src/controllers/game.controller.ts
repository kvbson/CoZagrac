import { Request, Response } from 'express';
import { getGameSearchHttpSchema } from '@cozagrac/shared/contracts/api';
import { getGameInfoByAppIdHttpSchema, getSimilarGamesHttpSchema } from '../schemas/game.zod.js';
import { gameService } from '../services/game.service.js';
import { embeddingService } from '../services/embeddings.service.js';

export const searchGames = async (req: Request, res: Response) => {
  const { q, limit } = getGameSearchHttpSchema.parse(req).query;

  const items = await gameService.search(q, limit);

  return res.status(200).json({ items });
};

export const getGameInfoByAppId = async (req: Request, res: Response) => {
  const { query } = getGameInfoByAppIdHttpSchema.parse(req);

  const { appId } = query;

  const game = await gameService.getByAppId(appId);

  if (!game) {
    return res.sendStatus(404);
  }

  return res.status(200).json(game);
};

export const getSimilarGames = async (req: Request, res: Response) => {
  const { appId, limit } = getSimilarGamesHttpSchema.parse(req).query;

  const items = await embeddingService.game.findSimilarToGame(appId, limit);

  return res.status(200).json({ items });
};
