import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gameService } from '../services/gameService';
import { RecommendationList } from '../features/recommendations/RecommendationList';
import { ReviewSection } from '../features/reviews/ReviewSection';
import { stripHtml } from '../utils/html';

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

          {game.appUrl && (
            <a href={game.appUrl} target="_blank" rel="noreferrer">
              Open in Steam Store
            </a>
          )}
        </div>
      </div>

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
