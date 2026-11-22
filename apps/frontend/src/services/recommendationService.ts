import type {
  GameTaxonomyResponse,
  ProfileSource,
  RecommendationExplainResponse,
  RecommendationFilters,
  UserEmbeddingStatusResponse,
  UserRecommendationsResponse,
} from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

export const recommendationService = {
  getRecommendations: async (
    limit = 20,
    cursor?: number,
    filters: RecommendationFilters = {},
  ): Promise<ServiceResponse<UserRecommendationsResponse>> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor !== undefined) {
      params.set('cursor', String(cursor));
    }
    if (filters.isFree !== undefined) {
      params.set('isFree', String(filters.isFree));
    }
    if (filters.minDiscount !== undefined) {
      params.set('minDiscount', String(filters.minDiscount));
    }
    if (filters.minReviewTier !== undefined) {
      params.set('minReviewTier', filters.minReviewTier);
    }
    if (filters.yearFrom !== undefined) {
      params.set('yearFrom', String(filters.yearFrom));
    }
    if (filters.platform !== undefined) {
      params.set('platform', filters.platform);
    }
    if (filters.genres?.length) {
      params.set('genres', filters.genres.join(','));
    }

    return fetchApi<UserRecommendationsResponse>(`/api/user/me/recommendations?${params.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Why these recommendations: profile basis games with their weights and
   * the explicit-rating feedback state. Loaded on demand (panel open).
   */
  getExplain: async (): Promise<ServiceResponse<RecommendationExplainResponse>> =>
    fetchApi<RecommendationExplainResponse>('/api/user/me/recommendations/explain', {
      method: 'GET',
    }),

  /** genre facets with game counts - options for the genre filter */
  getTaxonomy: async (): Promise<ServiceResponse<GameTaxonomyResponse>> =>
    fetchApi<GameTaxonomyResponse>('/api/game/taxonomy', { method: 'GET' }),

  /**
   * Starts (re)building the profile embedding from the chosen basis -
   * async job, poll getEmbeddingStatus.
   */
  buildProfile: async (
    source: ProfileSource,
  ): Promise<ServiceResponse<UserEmbeddingStatusResponse>> =>
    fetchApi<UserEmbeddingStatusResponse>('/api/user/me/embedding', {
      method: 'POST',
      body: JSON.stringify({ source }),
    }),

  getEmbeddingStatus: async (): Promise<ServiceResponse<UserEmbeddingStatusResponse>> =>
    fetchApi<UserEmbeddingStatusResponse>('/api/user/me/embedding/status', {
      method: 'GET',
    }),
};
