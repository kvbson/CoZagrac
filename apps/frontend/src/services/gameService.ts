import type {
  GameDetailsResponse,
  SimilarGamesResponse,
} from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

export const gameService = {
  getGame: async (appId: number): Promise<ServiceResponse<GameDetailsResponse>> =>
    fetchApi<GameDetailsResponse>(`/api/game?appId=${appId}`, { method: 'GET' }),

  getSimilar: async (
    appId: number,
    limit = 8,
  ): Promise<ServiceResponse<SimilarGamesResponse>> =>
    fetchApi<SimilarGamesResponse>(`/api/game/similar?appId=${appId}&limit=${limit}`, {
      method: 'GET',
    }),
};
