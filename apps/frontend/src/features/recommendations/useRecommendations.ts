import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  RecommendationItem,
  UserRecommendationsResponse,
} from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../../types/response';
import { recommendationService } from '../../services/recommendationService';

const PAGE_SIZE = 20;

type Status = 'loading' | 'ready' | 'error';

type Page = ServiceResponse<UserRecommendationsResponse>;

/** scalanie stron z kursora; defensywna deduplikacja na granicy similarity */
function mergePages(pages: Page[]): RecommendationItem[] {
  const seen = new Set<number>();
  const out: RecommendationItem[] = [];

  for (const page of pages) {
    if (!page.success || !page.userData) continue;

    for (const item of page.userData.items) {
      if (seen.has(item.steamAppid)) continue;
      seen.add(item.steamAppid);
      out.push(item);
    }
  }

  return out;
}

/**
 * Kursorowe (score-based) pobieranie rekomendacji + (prze)budowa profilu.
 */
export function useRecommendations() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['recommendations'],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => recommendationService.getRecommendations(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || !lastPage.userData) return undefined;
      return lastPage.userData.nextCursor ?? undefined;
    },
  });

  const pages = query.data?.pages ?? [];
  const items = mergePages(pages);

  const firstPage = pages[0];
  const firstError =
    firstPage && !firstPage.success
      ? (firstPage.error?.message ?? 'Failed to load recommendations')
      : null;
  const hasEmbedding = firstPage?.userData?.hasEmbedding ?? true;

  const buildMutation = useMutation({
    mutationFn: async () => {
      const res = await recommendationService.buildProfile();
      if (!res.success || !res.userData) {
        throw new Error(res.error?.message ?? 'Could not build your profile');
      }
      return res.userData;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
  });

  const load = useCallback(() => query.refetch(), [query]);
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);
  const buildProfile = useCallback(async () => {
    try {
      await buildMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [buildMutation]);

  const status: Status = query.isPending ? 'loading' : firstError ? 'error' : 'ready';
  const error = firstError ?? buildMutation.error?.message ?? null;

  return {
    items,
    status,
    error,
    building: buildMutation.isPending,
    loadingMore: query.isFetchingNextPage,
    refreshing: query.isFetching,
    hasEmbedding,
    hasMore: !!query.hasNextPage,
    load,
    loadMore,
    buildProfile,
  };
}
