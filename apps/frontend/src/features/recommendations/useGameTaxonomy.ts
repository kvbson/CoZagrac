import { useQuery } from '@tanstack/react-query';
import { recommendationService } from '../../services/recommendationService';

/** genre facets with game counts - options for the recommendations genre filter */
export function useGameTaxonomy() {
  return useQuery({
    queryKey: ['game-taxonomy'],
    queryFn: async () => {
      const res = await recommendationService.getTaxonomy();
      if (!res.success || !res.userData) {
        throw new Error(res.error?.message ?? 'Could not load genres');
      }
      return res.userData.items;
    },
    staleTime: 5 * 60_000,
  });
}
