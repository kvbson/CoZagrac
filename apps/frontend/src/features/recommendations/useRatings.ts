import type { UserRecommendationsResponse } from '@cozagrac/shared/contracts/api';
import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useMemo } from 'react';
import { MessageContext } from '../../context/MessageContext';
import { ratingsService } from '../../services/ratingsService';
import type { ServiceResponse } from '../../types/response';

type RecommendationsPage = ServiceResponse<UserRecommendationsResponse>;

type RecommendationsData = InfiniteData<RecommendationsPage, unknown>;

/** removes one game from every cached page of every recommendations query */
function removeItem(data: RecommendationsData | undefined, steamAppid: number) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => {
      if (!page.success || !page.userData) return page;

      return {
        ...page,
        userData: {
          ...page.userData,
          items: page.userData.items.filter((item) => item.steamAppid !== steamAppid),
        },
      };
    }),
  };
}

type Options = {
  /**
   * true (recommendation cards): the rated game drops out of the list
   * optimistically. false (library cards): the game stays - the rating
   * only updates the persisted state.
   */
  removeFromRecommendations?: boolean;
};

/**
 * Explicit feedback loop: rating a game persists a 1-5 value; the engine
 * consumes it as a query-time centroid correction. Shows a message on
 * outcome (frontend has no global error banner, so give inline feedback).
 */
export function useRatings({ removeFromRecommendations = true }: Options = {}) {
  const queryClient = useQueryClient();
  const { showMessage } = useContext(MessageContext);

  const query = useQuery({
    queryKey: ['ratings'],
    queryFn: () => ratingsService.get(),
  });

  const ratings = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of query.data?.userData?.items ?? []) {
      map.set(item.steamAppid, item.rating);
    }
    return map;
  }, [query.data]);

  const rateMutation = useMutation({
    mutationFn: (input: { steamAppid: number; rating: number }) =>
      ratingsService.set(input.steamAppid, input.rating),
    onMutate: async ({ steamAppid }) => {
      if (!removeFromRecommendations) return;

      await queryClient.cancelQueries({ queryKey: ['recommendations'] });
      queryClient.setQueriesData<
        InfiniteData<ServiceResponse<UserRecommendationsResponse>, unknown>
      >({ queryKey: ['recommendations'] }, (data) => removeItem(data, steamAppid));
    },
    onSettled: (_data, error) => {
      void queryClient.invalidateQueries({ queryKey: ['ratings'] });

      if (error) {
        showMessage('error', 'Could not save your rating. Please try again.');
      } else {
        showMessage('success', 'Rating saved.');
      }
    },
  });

  const rate = (steamAppid: number, rating: number) => {
    rateMutation.mutate({ steamAppid, rating });
  };

  return { ratings, rate, ratingPending: rateMutation.isPending };
}
