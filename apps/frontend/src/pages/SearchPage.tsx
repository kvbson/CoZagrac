import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { gameService } from '../services/gameService';

const REVIEW_TIER_LABELS: Record<string, string> = {
  S: '10k+ reviews',
  A: '5k+ reviews',
  B: '1k+ reviews',
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();

  const searchQuery = useQuery({
    queryKey: ['game-search', q],
    queryFn: () => gameService.search(q),
    enabled: q.length > 0,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    setSearchParams(value ? { q: value } : {}, { replace: false });
  }

  const items = searchQuery.data?.userData?.items ?? [];
  const failed = searchQuery.isSuccess && !searchQuery.data?.success;
  const errorMessage = searchQuery.data?.error?.message ?? 'Search failed.';

  return (
    <section>
      <div className="page__header">
        <h1>Search games</h1>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        {/* key=g: nawigacja z nawigacji (navbar) nadpisuje pole nowym zapytaniem */}
        <input key={q} name="q" type="search" defaultValue={q} placeholder="e.g. open world rpg" />
        <button type="submit">Search</button>
      </form>

      {q === '' && <p className="muted">Type a title, genre or keyword to search the catalog.</p>}

      {q !== '' && searchQuery.isPending && <p>Searching…</p>}

      {failed && <p className="error">{errorMessage}</p>}

      {searchQuery.isSuccess && searchQuery.data?.success && items.length === 0 && (
        <p className="muted">No games found for “{q}”.</p>
      )}

      <div className="rec-grid">
        {items.map((item) => (
          <Card key={item.steamAppid}>
            <Link to={`/games/${item.steamAppid}`}>
              {item.headerImage ? (
                <img className="card__img" src={item.headerImage} alt="" loading="lazy" />
              ) : (
                <div className="card__img card__img--empty">No image</div>
              )}
            </Link>

            <div className="card__body">
              <h3>
                <Link to={`/games/${item.steamAppid}`}>{item.name}</Link>
              </h3>

              <div className="card__meta">
                {item.isFree ? (
                  <span className="badge">Free to Play</span>
                ) : item.priceFinalFormatted ? (
                  <span className="badge">{item.priceFinalFormatted}</span>
                ) : null}

                {item.priceDiscountPercent ? (
                  <span className="badge badge--sale">-{item.priceDiscountPercent}%</span>
                ) : null}

                {item.reviewTier && REVIEW_TIER_LABELS[item.reviewTier] ? (
                  <span className="badge">{REVIEW_TIER_LABELS[item.reviewTier]}</span>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
