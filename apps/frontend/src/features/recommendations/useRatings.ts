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
      // the explain panel shows the rating feedback state - keep it live
      void queryClient.invalidateQueries({ queryKey: ['recommendations-explain'] });

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

  /** removes a single rating; the game returns to recommendation candidates */
  const removeMutation = useMutation({
    mutationFn: (steamAppid: number) => ratingsService.remove(steamAppid),
    onSuccess: (_data, steamAppid) => {
      queryClient.setQueryData<ServiceResponse<UserRatingsResponse>>(['ratings'], (current) => {
        if (!current?.userData) return current;
        return {
          ...current,
          userData: {
            items: current.userData.items.filter((item) => item.steamAppid !== steamAppid),
          },
        };
      });
      // without the rating the game is a candidate again - refetch lists
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onSettled: (data, error) => {
      void queryClient.invalidateQueries({ queryKey: ['ratings'] });
      // the rated game leaves the library's rated-games section
      void queryClient.invalidateQueries({ queryKey: ['steam-library'] });
      // without the rating the game is a candidate again - refetch lists
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      void queryClient.invalidateQueries({ queryKey: ['recommendations-explain'] });

      if (error || !data?.success) {
        showMessage('error', data?.error?.message ?? 'Could not remove your rating. Please try again.');
      } else {
        showMessage('success', 'Rating removed.');
      }
    },
  });

  const remove = (steamAppid: number) => {
    removeMutation.mutate(steamAppid);
  };

  const resetMutation = useMutation({
    mutationFn: () => ratingsService.removeAll(),
    onSettled: (data, error) => {
      void queryClient.invalidateQueries({ queryKey: ['ratings'] });
      // ratings influence the query-time centroid correction - refresh lists
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      void queryClient.invalidateQueries({ queryKey: ['recommendations-explain'] });
      // the library rated-games section empties on a full reset
      void queryClient.invalidateQueries({ queryKey: ['steam-library'] });

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
    remove,
    resetAll,
    ratingPending: rateMutation.isPending || removeMutation.isPending || resetMutation.isPending,
  };
}
