import type {
  GenerateUserEmbeddingResponse,
  UserRecommendationsResponse,
} from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

export const recommendationService = {
  getRecommendations: async (
    limit = 20,
    cursor?: number,
  ): Promise<ServiceResponse<UserRecommendationsResponse>> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor !== undefined) {
      params.set('cursor', String(cursor));
    }

    return fetchApi<UserRecommendationsResponse>(`/api/user/me/recommendations?${params.toString()}`, {
      method: 'GET',
    });
  },

  /** (Prze)budowuje embedding profilu na podstawie biblioteki Steam - synchronicznie, może potrwać */
  buildProfile: async (): Promise<ServiceResponse<GenerateUserEmbeddingResponse>> =>
    fetchApi<GenerateUserEmbeddingResponse>('/api/user/me/embedding', {
      method: 'POST',
    }),
};
