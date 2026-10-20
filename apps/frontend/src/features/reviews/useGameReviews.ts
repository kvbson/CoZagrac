import { useInfiniteQuery } from '@tanstack/react-query';
import type { GameReviewsSort } from '@cozagrac/shared/contracts/api';
import { reviewService } from '../../services/reviewService';

const PAGE_SIZE = 10;

/**
 * Stronicowane recenzje (page-based, nie kursorowe - backend zwraca {page, pages}).
 * Backend oddaje 404 gdy brak recenzji - to stan "pusty", nie błąd.
 */
export function useGameReviews(steamAppid: number, sort: GameReviewsSort) {
  return useInfiniteQuery({
    queryKey: ['reviews', steamAppid, sort],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => reviewService.getReviews(steamAppid, pageParam, PAGE_SIZE, sort),
    getNextPageParam: (lastPage) => {
      const data = lastPage.userData;
      if (!lastPage.success || !data) return undefined;
      return data.page < data.pages ? data.page + 1 : undefined;
    },
  });
}
