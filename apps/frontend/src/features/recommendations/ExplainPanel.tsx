import { useState } from 'react';
import type { RecommendationExplainResponse } from '@cozagrac/shared/contracts/api';
import { useRecommendationExplain } from './useRecommendationExplain';

const SOURCE_LABEL: Record<RecommendationExplainResponse['source'], string> = {
  'steam-library': 'your most played Steam games',
  'manual-games': 'games you picked',
};

/** human-readable direction of the rating feedback */
const EFFECT_LABEL = {
  toward: { text: 'pulls your profile', className: 'badge badge--match' },
  away: { text: 'pushes your profile away', className: 'badge badge--sale' },
  neutral: { text: 'neutral', className: 'badge' },
} as const;

function formatPlaytime(minutes: number): string {
  return minutes >= 60 ? `${Math.round(minutes / 60)} h played` : `${minutes} min played`;
}

/**
 * "Why these recommendations" panel: the games the profile centroid was
 * built from (with their current weights) and the rating feedback loop
 * state. Data loads on demand - only while the panel is expanded (the
 * steam-library basis calls the Steam API for live playtime).
 */
export function ExplainPanel() {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, isError, error } = useRecommendationExplain(expanded);

  return (
    <section className="explain">
      <button
        type="button"
        className="chip"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Hide why these recommendations' : 'Why these recommendations?'}
      </button>

      {expanded && (
        <div className="explain__body">
          {isPending && <p className="muted">Loading the basis of your profile…</p>}

          {isError && <p className="error">{error.message}</p>}

          {data && (
            <>
              <p className="muted">
                Profile built from{' '}
                <strong>
                  {data.gamesUsed} {SOURCE_LABEL[data.source]}
                </strong>{' '}
                (last rebuild: {new Date(data.createdAt).toLocaleString()}).
              </p>

              {data.basisGames.length > 0 && (
                <>
                  <h3>Profile basis</h3>
                  <ul className="explain__list">
                    {data.basisGames.map((game) => (
                      <li key={game.steamAppid}>
                        {game.headerImage && (
                          <img src={game.headerImage} alt="" loading="lazy" width={46} height={22} />
                        )}
                        <span className="explain__name">{game.name}</span>
                        {game.playtimeForever !== null && (
                          <span className="badge">{formatPlaytime(game.playtimeForever)}</span>
                        )}
                        {game.rating !== null && (
                          <span className="badge">rated {game.rating}/5</span>
                        )}
                        <span className="badge badge--match">weight {game.weight.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {data.ratedGames.length > 0 && (
                <>
                  <h3>Your ratings (feedback loop)</h3>
                  <ul className="explain__list">
                    {data.ratedGames.map((game) => {
                      const effect = EFFECT_LABEL[game.effect];
                      return (
                        <li key={game.steamAppid}>
                          <span className="explain__name">{game.name}</span>
                          <span className="badge">rated {game.rating}/5</span>
                          <span className={effect.className}>{effect.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {data.basisGames.length === 0 && data.ratedGames.length === 0 && (
                <p className="muted">
                  No basis data available for this profile (the Steam library may be private).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
