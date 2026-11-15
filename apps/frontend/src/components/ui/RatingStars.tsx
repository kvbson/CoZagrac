import { useEffect, useState } from 'react';

const SCALE = [1, 2, 3, 4, 5] as const;

type Props = {
  /** persisted rating; undefined = not rated yet */
  rating?: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
};

/**
 * 1-5 star picker on a recommendation card. Clicking a star rates the game;
 * the game then disappears from the list (handled by useRatings), so the
 * component mostly lives for a moment - keep local hover state simple.
 */
export function RatingStars({ rating, onRate, disabled = false }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => () => setHover(null), []);

  const active = hover ?? rating ?? 0;

  return (
    <div className="rating" role="group" aria-label="Rate this game">
      {SCALE.map((value) => (
        <button
          key={value}
          type="button"
          className={`rating__star ${value <= active ? 'rating__star--active' : ''}`}
          disabled={disabled}
          aria-label={`Rate ${value} of 5`}
          onMouseEnter={() => setHover(value)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onRate(value)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
