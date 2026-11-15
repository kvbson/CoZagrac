export type GameView = 'grid' | 'details';

type Props = {
  view: GameView;
  onChange: (view: GameView) => void;
};

/**
 * Grid/details switcher in the style of Windows Explorer view controls.
 * Inline SVG icons on purpose - no icon library dependency.
 */
export function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="view-toggle" role="group" aria-label="List layout">
      <button
        type="button"
        className={`view-toggle__btn${view === 'grid' ? ' view-toggle__btn--active' : ''}`}
        aria-pressed={view === 'grid'}
        aria-label="Grid view"
        title="Grid view"
        onClick={() => onChange('grid')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" fill="currentColor" />
          <rect x="9" y="1" width="6" height="6" fill="currentColor" />
          <rect x="1" y="9" width="6" height="6" fill="currentColor" />
          <rect x="9" y="9" width="6" height="6" fill="currentColor" />
        </svg>
      </button>

      <button
        type="button"
        className={`view-toggle__btn${view === 'details' ? ' view-toggle__btn--active' : ''}`}
        aria-pressed={view === 'details'}
        aria-label="Details view"
        title="Details view"
        onClick={() => onChange('details')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="2" width="14" height="2.5" fill="currentColor" />
          <rect x="1" y="6.75" width="14" height="2.5" fill="currentColor" />
          <rect x="1" y="11.5" width="14" height="2.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
