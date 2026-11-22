import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameTaxonomy } from './useGameTaxonomy';

type Props = {
  /** currently selected genre names */
  selected: string[];
  onChange: (genres: string[]) => void;
};

/**
 * Genre filter as a combo box: input with a dropdown arrow that opens the
 * option list; typing narrows the options (case-insensitive substring).
 * The master checkbox on the input field selects/deselects every VISIBLE
 * (filtered) option; individual options are evenly aligned checkboxes.
 */
export function GenreFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const masterRef = useRef<HTMLInputElement>(null);
  const { data: genres, isPending, isError } = useGameTaxonomy();

  const normalizedQuery = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      (genres ?? []).filter((genre) =>
        normalizedQuery ? genre.name.toLowerCase().includes(normalizedQuery) : true,
      ),
    [genres, normalizedQuery],
  );

  const visibleSelected = visible.filter((genre) => selected.includes(genre.name));
  const allVisibleSelected = visible.length > 0 && visibleSelected.length === visible.length;

  // master checkbox: checked = all visible selected, indeterminate = some
  useEffect(() => {
    if (masterRef.current) {
      masterRef.current.indeterminate = visibleSelected.length > 0 && !allVisibleSelected;
    }
  }, [visibleSelected.length, allVisibleSelected]);

  // close on outside click
  useEffect(() => {
    if (!open) return;

    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function toggle(name: string) {
    onChange(
      selected.includes(name) ? selected.filter((g) => g !== name) : [...selected, name],
    );
  }

  /** select/deselect every filtered (visible) option */
  function toggleAll() {
    if (allVisibleSelected) {
      const visibleNames = new Set(visible.map((genre) => genre.name));
      onChange(selected.filter((g) => !visibleNames.has(g)));
    } else {
      const next = new Set(selected);
      for (const genre of visible) {
        next.add(genre.name);
      }
      onChange([...next]);
    }
  }

  return (
    <div className="combo" ref={rootRef}>
      <div className="combo__control">
        <input
          ref={masterRef}
          type="checkbox"
          className="genre-check"
          aria-label="Select all genres"
          checked={allVisibleSelected}
          onChange={toggleAll}
          onMouseDown={(event) => event.stopPropagation()}
        />
        <input
          type="text"
          className="combo__input"
          placeholder={`Genres${selected.length ? ` (${selected.length})` : ''}`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          className="combo__arrow"
          aria-label="Toggle genre list"
          onClick={() => setOpen((value) => !value)}
        >
          ▾
        </button>
      </div>

      {open && (
        <div className="combo__menu">
          {isPending && <p className="muted">Loading genres…</p>}
          {isError && <p className="error">Could not load genres.</p>}

          {genres && visible.length === 0 && (
            <p className="muted">{query ? 'No genres match.' : 'No genres available.'}</p>
          )}

          {visible.map((genre) => (
            <label key={genre.name} className="combo__item">
              <input
                type="checkbox"
                className="genre-check"
                checked={selected.includes(genre.name)}
                onChange={() => toggle(genre.name)}
              />
              <span className="combo__name">{genre.name}</span>
              <span className="badge">{genre.gameCount}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
