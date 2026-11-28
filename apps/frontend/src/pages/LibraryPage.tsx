import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
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

type LibraryTab = 'steam' | 'rated';

/** reads ?tab= and falls back sensibly (steam tab only when Steam is linked) */
function readTab(params: URLSearchParams, steamLinked: boolean, hasSteamGames: boolean): LibraryTab {
  const tab = params.get('tab');
  if (tab === 'rated') return 'rated';
  if (tab === 'steam') return steamLinked ? 'steam' : 'rated';
  // default: steam tab when it has content, otherwise rated (if any)
  if (steamLinked && hasSteamGames) return 'steam';
  return 'rated';
}

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const libraryQuery = useQuery({
    queryKey: ['steam-library'],
    queryFn: () => userService.getLibrary(),
  });

  // library cards keep the game on the list after rating (no removal)
  const { ratings, rate, remove, resetAll, ratingPending } = useRatings({
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
          {libraryQuery.data?.error?.message ?? 'Failed to load your library.'}
        </p>
        <Button onClick={() => void libraryQuery.refetch()}>Try again</Button>
      </div>
    );
  }

  // Steam-owned games first (sorted by playtime server-side); rated games
  // without a Steam entry carry playtime 0 and land in the rated tab
  const steamGames = data.steamLinked ? data.items.filter((game) => game.playtimeForever > 0) : [];
  const ratedOnly = data.items.filter(
    (game) => !steamGames.some((steam) => steam.steamAppid === game.steamAppid),
  );

  const activeTab = readTab(searchParams, data.steamLinked, steamGames.length > 0);

  function setTab(tab: LibraryTab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }

  const renderCard = (game: (typeof data.items)[number]) => {
    const rating = ratings.get(game.steamAppid);

    const body = (
      <div className="card__body">
        <h3>{game.name}</h3>
        <div className="card__meta">
          {game.playtimeForever > 0 && <span className="badge">{formatPlaytime(game.playtimeForever)}</span>}
          {!game.headerImage && <span className="badge">not in catalog</span>}
          {rating !== undefined && (
            <button
              type="button"
              className="rating-remove"
              title="Remove rating"
              aria-label={`Remove rating for ${game.name}`}
              disabled={ratingPending}
              onClick={() => remove(game.steamAppid)}
            >
              ×
            </button>
          )}
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
  };

  const tabAvailable = (tab: LibraryTab) =>
    tab === 'steam' ? data.steamLinked && steamGames.length > 0 : ratedOnly.length > 0;

  // if the active tab has no content (e.g. after removing the last rated
  // game), fall back to the other one so the page never shows an empty tab
  const effectiveTab: LibraryTab = tabAvailable(activeTab) ? activeTab : activeTab === 'steam' ? 'rated' : 'steam';

  const tabGames = effectiveTab === 'steam' ? steamGames : ratedOnly;

  return (
    <section>
      <div className="page__header">
        <h1>Your library</h1>
        <div className="page__actions">
          <ViewToggle view={view} onChange={setView} />
          <Button onClick={resetAll} disabled={ratingPending || ratings.size === 0}>
            Reset all ratings
          </Button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={effectiveTab === 'steam'}
          className={`tab${effectiveTab === 'steam' ? ' tab--active' : ''}`}
          disabled={!tabAvailable('steam')}
          onClick={() => setTab('steam')}
        >
          Steam library ({steamGames.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={effectiveTab === 'rated'}
          className={`tab${effectiveTab === 'rated' ? ' tab--active' : ''}`}
          disabled={!tabAvailable('rated')}
          onClick={() => setTab('rated')}
        >
          Rated games ({ratedOnly.length})
        </button>
      </div>

      {effectiveTab === 'steam' ? (
        <>
          <p className="muted">
            Sorted by playtime. Games from our catalog link to their details — rate them (1-5) to
            tune your recommendations.
          </p>
          {view === 'details' ? (
            <LibraryTable games={tabGames} ratings={ratings} onRate={rate} onRemove={remove} ratingPending={ratingPending} />
          ) : (
            <div className="rec-grid">{tabGames.map(renderCard)}</div>
          )}
        </>
      ) : (
        <>
          <p className="muted">
            Games you rated that are not in your Steam library. Removing a rating returns the game
            to recommendation candidates.
          </p>
          {view === 'details' ? (
            <LibraryTable games={tabGames} ratings={ratings} onRate={rate} onRemove={remove} ratingPending={ratingPending} />
          ) : (
            <div className="rec-grid">{tabGames.map(renderCard)}</div>
          )}
        </>
      )}

      {tabGames.length === 0 && (
        <div className="center">
          <p>
            {data.steamLinked
              ? 'Your Steam library is empty or private.'
              : 'This account has no linked Steam profile yet.'}{' '}
            Rate games from <Link to="/recommendations">Recommendations</Link> to build your taste
            profile — they will show up here.
          </p>
        </div>
      )}
    </section>
  );
}
