import { useQuery } from '@tanstack/react-query';
import { recommendationService } from '../../services/recommendationService';

/**
 * Why these recommendations: profile basis + rating feedback state.
 * Fetched only while the explain panel is open (on-demand endpoint -
 * the steam-library basis calls the Steam API for live playtime).
 */
export function useRecommendationExplain(open: boolean) {
  return useQuery({
    queryKey: ['recommendations-explain'],
    queryFn: async () => {
      const res = await recommendationService.getExplain();
      if (!res.success || !res.userData) {
        throw new Error(res.error?.message ?? 'Could not load the recommendation basis');
      }
      return res.userData;
    },
    enabled: open,
    staleTime: 60_000,
  });
}
