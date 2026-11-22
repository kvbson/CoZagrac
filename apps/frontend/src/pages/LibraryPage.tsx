import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RatingSlider } from '../components/ui/RatingSlider';
import { ViewToggle } from '../components/ui/ViewToggle';
import { userService } from '../services/userService';
import { LibraryTable } from '../features/games/LibraryTable';
import { formatPlaytime } from '../features/games/playtime';
import { useViewPreference } from '../features/games/useViewPreference';
import { useRatings } from '../features/recommendations/useRatings';

export function LibraryPage() {
  const libraryQuery = useQuery({
    queryKey: ['steam-library'],
    queryFn: () => userService.getLibrary(),
  });

  // library cards keep the game on the list after rating (no removal)
  const { ratings, rate, resetAll, ratingPending } = useRatings({
    removeFromRecommendations: false,
  });

  // pure UI state, remembered per page in localStorage
  const [view, setView] = useViewPreference('library');

  const data = libraryQuery.data?.userData ?? null;

  if (libraryQuery.isPending) {
    return (
      <div className="center">
        <p>Loading your library…</p>
      </div>
    );
  }

  if (!libraryQuery.isSuccess || !libraryQuery.data?.success || !data) {
    return (
      <div className="center">
        <p className="error">
          {libraryQuery.data?.error?.message ?? 'Failed to load your Steam library.'}
        </p>
        <Button onClick={() => void libraryQuery.refetch()}>Try again</Button>
      </div>
    );
  }

  if (!data.steamLinked) {
    return (
      <section className="center">
        <h1>Your library</h1>
        <p>
          This account has no linked Steam profile. Log in with Steam to see your library here —
          or build your taste profile from games you pick yourself in
          <Link to="/recommendations">Recommendations</Link>.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="page__header">
        <h1>Your library ({data.items.length})</h1>
        <div className="page__actions">
          <ViewToggle view={view} onChange={setView} />
          <Button onClick={resetAll} disabled={ratingPending || ratings.size === 0}>
            Reset all ratings
          </Button>
        </div>
      </div>

      <p className="muted">
        Sorted by playtime. Games from our catalog link to their details — rate them (1-5) to
        tune your recommendations.
      </p>

      {view === 'details' ? (
        <LibraryTable games={data.items} ratings={ratings} onRate={rate} ratingPending={ratingPending} />
      ) : (
        <div className="rec-grid">
          {data.items.map((game) => {
            const rating = ratings.get(game.steamAppid);

            const body = (
              <div className="card__body">
                <h3>{game.name}</h3>
                <div className="card__meta">
                  <span className="badge">{formatPlaytime(game.playtimeForever)}</span>
                  {!game.headerImage && <span className="badge">not in catalog</span>}
                </div>
                {game.headerImage ? (
                  <RatingSlider
                    rating={rating}
                    onRate={(value) => rate(game.steamAppid, value)}
                    label={game.name}
                    disabled={ratingPending}
                  />
                ) : null}
              </div>
            );

            return game.headerImage ? (
              <Card key={game.steamAppid}>
                <Link to={`/games/${game.steamAppid}`}>
                  <img className="card__img" src={game.headerImage} alt="" loading="lazy" />
                </Link>
                {body}
              </Card>
            ) : (
              <Card key={game.steamAppid}>
                <div className="card__img card__img--empty">No image</div>
                {body}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
