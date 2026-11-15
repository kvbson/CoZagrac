import type { UserFavoritesResponse } from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

/**
 * Manual profile basis: the games the user picked for the source wizard.
 * Persisted server-side so the async build job and page reloads can use it.
 */
export const favoritesService = {
  get: async (): Promise<ServiceResponse<UserFavoritesResponse>> =>
    fetchApi<UserFavoritesResponse>('/api/user/me/favorites', { method: 'GET' }),

  /** replaces the whole set */
  setAll: async (appIds: number[]): Promise<ServiceResponse<UserFavoritesResponse>> =>
    fetchApi<UserFavoritesResponse>('/api/user/me/favorites', {
      method: 'PUT',
      body: JSON.stringify({ appIds }),
    }),
};
