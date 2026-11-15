import type {
  GameDetailsResponse,
  GameSearchResponse,
  SimilarGamesResponse,
} from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

export const gameService = {
  getGame: async (appId: number): Promise<ServiceResponse<GameDetailsResponse>> =>
    fetchApi<GameDetailsResponse>(`/api/game?appId=${appId}`, { method: 'GET' }),

  search: async (
    q: string,
    limit = 20,
  ): Promise<ServiceResponse<GameSearchResponse>> =>
    fetchApi<GameSearchResponse>(
      `/api/game/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { method: 'GET' },
    ),

  getSimilar: async (
    appId: number,
    limit = 8,
  ): Promise<ServiceResponse<SimilarGamesResponse>> =>
    fetchApi<SimilarGamesResponse>(`/api/game/similar?appId=${appId}&limit=${limit}`, {
      method: 'GET',
    }),
};
