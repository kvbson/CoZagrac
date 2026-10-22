import { useInfiniteQuery } from '@tanstack/react-query';
import type { GameReviewsLanguage, GameReviewsSort } from '@cozagrac/shared/contracts/api';
import { reviewService } from '../../services/reviewService';

const PAGE_SIZE = 10;

/**
 * Stronicowane recenzje (page-based, nie kursorowe - backend zwraca {page, pages}).
 * Backend oddaje 404 gdy brak recenzji - to stan "pusty", nie błąd.
 */
export function useGameReviews(
  steamAppid: number,
  sort: GameReviewsSort,
  language: GameReviewsLanguage,
) {
  return useInfiniteQuery({
    queryKey: ['reviews', steamAppid, sort, language],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      reviewService.getReviews(steamAppid, pageParam, PAGE_SIZE, sort, language),
    getNextPageParam: (lastPage) => {
      const data = lastPage.userData;
      if (!lastPage.success || !data) return undefined;
      return data.page < data.pages ? data.page + 1 : undefined;
    },
  });
}
