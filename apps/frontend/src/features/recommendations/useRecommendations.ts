import { useCallback } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  RecommendationFilters,
  RecommendationItem,
  UserEmbeddingStatusResponse,
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
 * Kursorowe (score-based) pobieranie rekomendacji + asynchroniczne
 * (prze)budowywanie profilu: POST startuje job, a status jest odpytywany
 * co 2 s dopóki job nie wróci jako done/failed.
 */
export function useRecommendations(filters: RecommendationFilters) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['recommendations', filters],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      recommendationService.getRecommendations(PAGE_SIZE, pageParam, filters),
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || !lastPage.userData) return undefined;
      return lastPage.userData.nextCursor ?? undefined;
    },
  });

  const statusQuery = useQuery({
    queryKey: ['embedding-status'],
    queryFn: async () => {
      const res = await recommendationService.getEmbeddingStatus();
      const data = res.userData;
      if (data?.status === 'done') {
        await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      }
      return data;
    },
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 2000 : false),
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
      if (!res.success) {
        throw new Error(res.error?.message ?? 'Could not start building your profile');
      }
      return res.userData;
    },
    onSuccess: (data) => {
      // uruchamia pollowanie natychmiast po starcie joba
      const status: UserEmbeddingStatusResponse = data ?? { status: 'running' };
      queryClient.setQueryData(['embedding-status'], status);
    },
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

  const jobStatus = statusQuery.data?.status ?? 'idle';
  const jobError =
    statusQuery.data?.status === 'failed'
      ? (statusQuery.data.message ?? 'Failed to build your profile')
      : null;

  const status: Status = query.isPending ? 'loading' : firstError ? 'error' : 'ready';
  const error = firstError ?? buildMutation.error?.message ?? jobError;

  return {
    items,
    status,
    error,
    building: buildMutation.isPending || jobStatus === 'running',
    gamesUsed: jobStatus === 'done' ? (statusQuery.data?.gamesUsed ?? null) : null,
    loadingMore: query.isFetchingNextPage,
    refreshing: query.isFetching,
    hasEmbedding,
    hasMore: !!query.hasNextPage,
    load,
    loadMore,
    buildProfile,
  };
}
