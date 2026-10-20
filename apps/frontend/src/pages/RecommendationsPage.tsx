import { Button } from '../components/ui/Button';
import { RecommendationList } from '../features/recommendations/RecommendationList';
import { useRecommendations } from '../features/recommendations/useRecommendations';

export function RecommendationsPage() {
  const {
    items,
    status,
    error,
    building,
    loadingMore,
    refreshing,
    hasEmbedding,
    hasMore,
    load,
    loadMore,
    buildProfile,
  } = useRecommendations();

  if (status === 'loading') {
    return (
      <div className="center">
        <p>Loading recommendations…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="center">
        <p className="error">{error}</p>
        <Button onClick={load} disabled={refreshing}>
          {refreshing ? 'Loading…' : 'Try again'}
        </Button>
      </div>
    );
  }

  if (!hasEmbedding) {
    return (
      <section className="center">
        <h1>No profile yet</h1>
        <p>
          We build your taste profile from your most played Steam games. It takes a moment —
          then we will match you with games you have not played yet.
        </p>
        <Button onClick={buildProfile} disabled={building}>
          {building ? 'Building your profile…' : 'Build my profile'}
        </Button>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  return (
    <section>
      <div className="page__header">
        <h1>Your recommendations</h1>

        <Button onClick={buildProfile} disabled={building}>
          {building ? 'Recalculating profile…' : 'Recalculate profile'}
        </Button>
      </div>

      {error && <p className="error">{error}</p>}

      {items.length === 0 && !building ? (
        <p>No suggestions found. Try recalculating your profile.</p>
      ) : (
        <RecommendationList items={items} />
      )}

      {hasMore && (
        <div className="center">
          <Button onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}
