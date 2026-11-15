import { useState } from 'react';
import type { GameView } from '../../components/ui/ViewToggle';

const STORAGE_PREFIX = 'cozagrac:view:';

/**
 * UI-only state (not server state) persisted in localStorage. The stored
 * value is read in the lazy useState initializer - no setState-in-effect
 * pattern, so the first paint already uses the remembered layout.
 */
export function useViewPreference(pageKey: string) {
  const storageKey = STORAGE_PREFIX + pageKey;

  const [view, setView] = useState<GameView>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored === 'details' ? 'details' : 'grid';
  });

  const changeView = (next: GameView) => {
    setView(next);
    localStorage.setItem(storageKey, next);
  };

  return [view, changeView] as const;
}
