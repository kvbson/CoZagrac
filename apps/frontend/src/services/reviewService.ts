import type {
  GameReviewsLanguage,
  GameReviewsResponse,
  GameReviewsSort,
} from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

export const reviewService = {
  getReviews: async (
    steamAppid: number,
    page = 1,
    limit = 10,
    sort: GameReviewsSort = 'newest',
    language: GameReviewsLanguage = 'all',
  ): Promise<ServiceResponse<GameReviewsResponse>> =>
    fetchApi<GameReviewsResponse>(
      `/api/reviews/${steamAppid}?page=${page}&limit=${limit}&sort=${sort}&language=${language}`,
      { method: 'GET' },
    ),
};
