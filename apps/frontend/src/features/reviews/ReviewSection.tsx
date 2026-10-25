import { useSearchParams } from 'react-router-dom';
import type { GameReviewsLanguage, GameReviewsSort } from '@cozagrac/shared/contracts/api';
import { Button } from '../../components/ui/Button';
import { ReviewCard } from './ReviewCard';
import { useGameReviews } from './useGameReviews';

const SORT_OPTIONS: { value: GameReviewsSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'highestRating', label: 'Highest rated' },
  { value: 'popularity', label: 'Most liked' },
];

const LANGUAGE_OPTIONS: { value: GameReviewsLanguage; label: string }[] = [
  { value: 'all', label: 'All languages' },
  { value: 'english', label: 'English' },
  { value: 'polish', label: 'Polish' },
];

function readSort(value: string | null): GameReviewsSort {
  if (value === 'highestRating' || value === 'popularity') return value;
  return 'newest';
}

function readLanguage(value: string | null): GameReviewsLanguage {
  if (value === 'english' || value === 'polish') return value;
  return 'all';
}

/**
 * Stan sortu i języka trzymany w URL-u (searchParams) - link z ustawionym
 * filtrem jest udostępnialny, a refresh zachowuje widok.
 */
export function ReviewSection({ steamAppid }: { steamAppid: number }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = readSort(searchParams.get('sort'));
  const language = readLanguage(searchParams.get('lang'));

  function setFilterParam(key: string, value: string, defaultValue: string) {
    const next = new URLSearchParams(searchParams);
    if (value === defaultValue) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  const reviewsQuery = useGameReviews(steamAppid, sort, language);

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

        <div className="reviews__filters">
          <select
            value={language}
            onChange={(e) => setFilterParam('lang', e.target.value, 'all')}
            aria-label="Filter reviews by language"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setFilterParam('sort', e.target.value, 'newest')}
            aria-label="Sort reviews"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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
