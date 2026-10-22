import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { GameDetailsResponse } from '@cozagrac/shared/contracts/api';
import { gameService } from '../services/gameService';
import { RecommendationList } from '../features/recommendations/RecommendationList';
import { ReviewSection } from '../features/reviews/ReviewSection';
import { stripHtml } from '../utils/html';

type Movie = GameDetailsResponse['movies'][number];

/** Steam movies: mp4 (movie.url) + miniatury; pierwszy odtwarzany po wejściu w sekcję */
function TrailersSection({ movies }: { movies: Movie[] }) {
  const withUrl = movies.filter((movie) => movie.url);
  const [selected, setSelected] = useState<Movie | null>(withUrl[0] ?? null);

  if (withUrl.length === 0) return null;

  return (
    <section>
      <h2>Videos</h2>

      {selected?.url && (
        <video
          className="game-video"
          src={selected.url}
          poster={selected.thumbnail ?? undefined}
          controls
          muted
          loop
          playsInline
        />
      )}

      {withUrl.length > 1 && (
        <div className="videos__strip">
          {withUrl.map((movie) => (
            <button
              key={movie.movieId}
              type="button"
              className={`video-thumb${selected?.movieId === movie.movieId ? ' video-thumb--active' : ''}`}
              onClick={() => setSelected(movie)}
              aria-label={movie.name ?? 'Play video'}
            >
              {movie.thumbnail ? <img src={movie.thumbnail} alt="" loading="lazy" /> : movie.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function RequirementsSection({ game }: { game: GameDetailsResponse }) {
  const blocks = [
    { title: 'Windows', minimum: game.pcMinimum, recommended: game.pcRecommended },
    { title: 'macOS', minimum: game.macMinimum, recommended: game.macRecommended },
    { title: 'Linux (SteamOS)', minimum: game.linuxMinimum, recommended: game.linuxRecommended },
  ]
    .map((block) => ({
      title: block.title,
      minimum: block.minimum ? stripHtml(block.minimum) : null,
      recommended: block.recommended ? stripHtml(block.recommended) : null,
    }))
    .filter((block) => block.minimum || block.recommended);

  if (blocks.length === 0) return null;

  return (
    <details className="sys-req">
      <summary>System requirements</summary>

      {blocks.map((block) => (
        <div key={block.title} className="sys-req__block">
          <h3>{block.title}</h3>

          {block.minimum && (
            <>
              <h4>Minimum</h4>
              <p className="pre-line">{block.minimum}</p>
            </>
          )}

          {block.recommended && (
            <>
              <h4>Recommended</h4>
              <p className="pre-line">{block.recommended}</p>
            </>
          )}
        </div>
      ))}
    </details>
  );
}

function PlatformBadges({
  windows,
  mac,
  linux,
}: {
  windows: boolean | null;
  mac: boolean | null;
  linux: boolean | null;
}) {
  return (
    <>
      {windows && <span className="badge">Windows</span>}
      {mac && <span className="badge">macOS</span>}
      {linux && <span className="badge">Linux</span>}
    </>
  );
}

export function GameDetailsPage() {
  const { appId: appIdParam } = useParams<{ appId: string }>();
  const appId = Number(appIdParam);
  const validId = Number.isInteger(appId) && appId > 0;

  const gameQuery = useQuery({
    queryKey: ['game', appId],
    queryFn: () => gameService.getGame(appId),
    enabled: validId,
  });

  const similarQuery = useQuery({
    queryKey: ['game', appId, 'similar'],
    queryFn: () => gameService.getSimilar(appId),
    enabled: validId,
  });

  if (!validId) {
    return <p className="error">Invalid game id.</p>;
  }

  if (gameQuery.isPending) {
    return (
      <div className="center">
        <p>Loading game…</p>
      </div>
    );
  }

  const firstResponse = gameQuery.data;
  const game = firstResponse?.userData ?? null;

  if (!gameQuery.isSuccess || !game) {
    return (
      <div className="center">
        <p>
          {firstResponse?.status === 404
            ? 'This game is not in our catalog yet.'
            : (firstResponse?.error?.message ?? 'Failed to load game.')}
        </p>
        <Link to="/recommendations">Back to recommendations</Link>
      </div>
    );
  }

  const about = [
    game.shortDescription,
    game.aboutTheGame ? stripHtml(game.aboutTheGame) : null,
  ].filter(Boolean);

  return (
    <article>
      <div className="game-hero">
        {game.headerImage && <img className="game-hero__img" src={game.headerImage} alt="" />}

        <div className="game-hero__body">
          <h1>{game.name}</h1>

          <div className="card__meta">
            {game.isFree ? (
              <span className="badge badge--match">Free to Play</span>
            ) : game.priceFinalFormatted ? (
              <span className="badge">
                {game.priceInitialFormatted && game.priceDiscountPercent ? (
                  <s className="muted">{game.priceInitialFormatted}</s>
                ) : null}{' '}
                {game.priceFinalFormatted}
              </span>
            ) : null}

            {game.priceDiscountPercent ? (
              <span className="badge badge--sale">-{game.priceDiscountPercent}%</span>
            ) : null}

            {game.reviewTier && <span className="badge">Reviews tier {game.reviewTier}</span>}
            {game.releaseDate && <span className="badge">{game.releaseDate}</span>}
            {game.requiredAge ? <span className="badge">{game.requiredAge}+</span> : null}

            <PlatformBadges
              windows={game.platformWindows}
              mac={game.platformMac}
              linux={game.platformLinux}
            />
          </div>

          <div className="card__meta">
            {game.genres.map((genre) => (
              <span key={genre.id} className="badge badge--genre">
                {genre.name}
              </span>
            ))}
            {game.categories.map((category) => (
              <span key={category.id} className="badge">
                {category.name}
              </span>
            ))}
          </div>

          {game.publishers.some((p) => p.name) && (
            <p className="muted">
              {game.publishers.map((p) => p.name).filter(Boolean).join(', ')}
            </p>
          )}

          <div className="card__meta">
            {game.appUrl && (
              <a href={game.appUrl} target="_blank" rel="noreferrer">
                Open in Steam Store
              </a>
            )}
            {game.website && (
              <a href={game.website} target="_blank" rel="noreferrer">
                Official website
              </a>
            )}
          </div>
        </div>
      </div>

      <TrailersSection movies={game.movies} />

      {about.length > 0 && (
        <section className="game-about">
          <h2>About this game</h2>
          {about.map((text, index) => (
            <p key={index} className="game-about__text">
              {text}
            </p>
          ))}
        </section>
      )}

      {game.screenshots.length > 0 && (
        <section>
          <h2>Screenshots</h2>
          <div className="shots">
            {game.screenshots.slice(0, 8).map((shot) => (
              <a
                key={shot.screenshotId}
                href={shot.pathFull ?? shot.pathThumbnail ?? undefined}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  className="shots__img"
                  src={shot.pathThumbnail ?? shot.pathFull ?? undefined}
                  alt=""
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      <RequirementsSection game={game} />

      <ReviewSection steamAppid={game.steamAppid} />

      <section>
        <h2>Similar games</h2>

        {similarQuery.isPending && <p className="muted">Loading…</p>}

        {!similarQuery.isPending && (similarQuery.data?.userData?.items.length ?? 0) === 0 && (
          <p className="muted">No similar games found.</p>
        )}

        {similarQuery.data?.userData && similarQuery.data.userData.items.length > 0 && (
          <RecommendationList items={similarQuery.data.userData.items} />
        )}
      </section>
    </article>
  );
}
