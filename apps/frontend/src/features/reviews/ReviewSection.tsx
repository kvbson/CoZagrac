import { useState } from 'react';
import type { GameReviewsSort } from '@cozagrac/shared/contracts/api';
import { Button } from '../../components/ui/Button';
import { ReviewCard } from './ReviewCard';
import { useGameReviews } from './useGameReviews';

const SORT_OPTIONS: { value: GameReviewsSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'highestRating', label: 'Highest rated' },
  { value: 'popularity', label: 'Most liked' },
];

export function ReviewSection({ steamAppid }: { steamAppid: number }) {
  const [sort, setSort] = useState<GameReviewsSort>('newest');
  const reviewsQuery = useGameReviews(steamAppid, sort);

  const pages = reviewsQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.userData?.items ?? []);
  const total = pages[0]?.userData?.total ?? 0;

  const firstPage = pages[0];
  const isEmpty =
    (firstPage && !firstPage.success && firstPage.status === 404) ||
    (firstPage?.success && total === 0);
  const loadError =
    firstPage && !firstPage.success && firstPage.status !== 404
      ? (firstPage.error?.message ?? 'Failed to load reviews')
      : null;

  return (
    <section className="reviews">
      <div className="page__header">
        <h2>Player reviews{total ? ` (${total})` : ''}</h2>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as GameReviewsSort)}
          aria-label="Sort reviews"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {reviewsQuery.isPending && <p>Loading reviews…</p>}

      {loadError && (
        <p className="error">
          {loadError}{' '}
          <Button onClick={() => void reviewsQuery.refetch()}>Try again</Button>
        </p>
      )}

      {isEmpty && !loadError && <p className="muted">No reviews in our database yet.</p>}

      <div className="reviews__list">
        {items.map((review) => (
          <ReviewCard key={review.recommendationId} review={review} />
        ))}
      </div>

      {reviewsQuery.hasNextPage && (
        <div className="center">
          <Button
            onClick={() => void reviewsQuery.fetchNextPage()}
            disabled={reviewsQuery.isFetchingNextPage}
          >
            {reviewsQuery.isFetchingNextPage ? 'Loading…' : 'Load more reviews'}
          </Button>
        </div>
      )}
    </section>
  );
}
