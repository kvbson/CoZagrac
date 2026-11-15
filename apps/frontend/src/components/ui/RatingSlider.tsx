import { useState } from 'react';

type Props = {
  /** persisted rating; undefined = not rated yet */
  rating?: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
  /** accessible label prefix, e.g. game name */
  label?: string;
};

const MIN = 1;
const MAX = 5;

/**
 * 1-5 slider picker (easier to slide than clicking stars). The value
 * commits on release (pointer up / key up), not on every drag step, so
 * one gesture = one mutation.
 */
export function RatingSlider({ rating, onRate, disabled = false, label = 'Rate this game' }: Props) {
  const [draft, setDraft] = useState(rating ?? 3);

  const commit = () => {
    if (draft !== rating) {
      onRate(draft);
    }
  };

  return (
    <div className="rating-slider">
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={draft}
        disabled={disabled}
        aria-label={`${label} (1-5)`}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <span className="rating-slider__value">{draft}/{MAX}</span>
    </div>
  );
}
