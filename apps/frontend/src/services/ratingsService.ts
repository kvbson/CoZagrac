import type { UserRatingsResponse } from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

type PutRatingResponse = { steamAppid: number; rating: number };

/**
 * Explicit 1-5 game ratings (feedback loop). Rated games leave the
 * recommendation candidates and correct the profile centroid at query time.
 */
export const ratingsService = {
  get: async (): Promise<ServiceResponse<UserRatingsResponse>> =>
    fetchApi<UserRatingsResponse>('/api/user/me/ratings', { method: 'GET' }),

  set: async (steamAppid: number, rating: number): Promise<ServiceResponse<PutRatingResponse>> =>
    fetchApi<PutRatingResponse>('/api/user/me/ratings', {
      method: 'PUT',
      body: JSON.stringify({ steamAppid, rating }),
    }),

  remove: async (steamAppid: number): Promise<ServiceResponse<null>> =>
    fetchApi<null>(`/api/user/me/ratings/${steamAppid}`, { method: 'DELETE' }),
};
