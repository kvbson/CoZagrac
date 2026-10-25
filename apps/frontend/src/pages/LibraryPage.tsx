import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { userService } from '../services/userService';

function formatPlaytime(minutes: number): string {
  if (!minutes) return 'no playtime';
  const hours = minutes / 60;
  return hours < 1 ? '<1 h played' : `${Math.round(hours)} h played`;
}

export function LibraryPage() {
  const libraryQuery = useQuery({
    queryKey: ['steam-library'],
    queryFn: () => userService.getLibrary(),
  });

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
          it is also what your taste profile is built from.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="page__header">
        <h1>Your library ({data.items.length})</h1>
      </div>

      <p className="muted">Sorted by playtime. Games from our catalog link to their details.</p>

      <div className="rec-grid">
        {data.items.map((game) => {
          const body = (
            <div className="card__body">
              <h3>{game.name}</h3>
              <div className="card__meta">
                <span className="badge">{formatPlaytime(game.playtimeForever)}</span>
                {!game.headerImage && <span className="badge">not in catalog</span>}
              </div>
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
    </section>
  );
}
