import type { UserRecommendationsResponse, UserRatingsResponse } from '@cozagrac/shared/contracts/api';
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
    // optimistic: rating state updates instantly (control fills in) and the
    // recommendation lists refetch - the engine corrects the centroid at
    // query time, so any cached ordering from before the rating is stale
    onSuccess: (res) => {
      const saved = res.userData;
      if (!saved) return;

      // ['ratings'] cache holds the ServiceResponse wrapper (queryFn returns
      // ratingsService.get() verbatim), so update inside userData
      queryClient.setQueryData<ServiceResponse<UserRatingsResponse>>(['ratings'], (current) => {
        if (!current?.userData) return current;
        const rest = current.userData.items.filter(
          (item) => item.steamAppid !== saved.steamAppid,
        );
        return {
          ...current,
          userData: { items: [...rest, { ...saved, name: '', headerImage: null }] },
        };
      });
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onMutate: async ({ steamAppid }) => {
      if (!removeFromRecommendations) return;

      await queryClient.cancelQueries({ queryKey: ['recommendations'] });
      queryClient.setQueriesData<
        InfiniteData<ServiceResponse<UserRecommendationsResponse>, unknown>
      >({ queryKey: ['recommendations'] }, (data) => removeItem(data, steamAppid));
    },
    onSettled: (data, error) => {
      void queryClient.invalidateQueries({ queryKey: ['ratings'] });

      // fetchApi never rejects - a failed save (422/401/network) arrives as
      // data.success === false, so both paths must be checked explicitly
      if (error || !data?.success) {
        showMessage('error', data?.error?.message ?? 'Could not save your rating. Please try again.');
      } else {
        showMessage('success', 'Rating saved.');
      }
    },
  });

  const rate = (steamAppid: number, rating: number) => {
    rateMutation.mutate({ steamAppid, rating });
  };

  const resetMutation = useMutation({
    mutationFn: () => ratingsService.removeAll(),
    onSettled: (data, error) => {
      void queryClient.invalidateQueries({ queryKey: ['ratings'] });
      // ratings influence the query-time centroid correction - refresh lists
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });

      if (error || !data?.success) {
        showMessage('error', data?.error?.message ?? 'Could not clear your ratings. Please try again.');
      } else {
        showMessage('success', 'All ratings cleared.');
      }
    },
  });

  const resetAll = () => resetMutation.mutate();

  return {
    ratings,
    rate,
    resetAll,
    ratingPending: rateMutation.isPending || resetMutation.isPending,
  };
}
