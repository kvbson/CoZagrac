import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MAX_FAVORITE_GAMES,
  MIN_FAVORITE_GAMES,
  type GameSearchItem,
  type ProfileSource,
  type UserFavoriteGame,
} from '@cozagrac/shared/contracts/api';
import { favoritesService } from '../../services/favoritesService';
import { gameService } from '../../services/gameService';
import type { BuildProfileInput } from '../recommendations/useRecommendations';

export type WizardStep = 'source' | 'games' | 'build';

function toFavorite(item: GameSearchItem | UserFavoriteGame): UserFavoriteGame {
  return { steamAppid: item.steamAppid, name: item.name, headerImage: item.headerImage };
}

/**
 * State of the "what should we build your profile from" wizard:
 * source -> (manual: pick games) -> build.
 *
 * The selection is derived from saved favorites + local add/remove deltas,
 * so no effect has to copy the favorites query into local state.
 */
export function useProfileWizard(onBuild: (input: BuildProfileInput) => Promise<boolean>) {
  const [step, setStep] = useState<WizardStep>('source');
  const [source, setSource] = useState<ProfileSource | null>(null);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [pickedItems, setPickedItems] = useState<Record<number, UserFavoriteGame>>({});

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesService.get(),
  });

  const saved = useMemo(
    () => favoritesQuery.data?.userData?.items ?? [],
    [favoritesQuery.data],
  );

  const searchQuery = useQuery({
    queryKey: ['game-search', submitted],
    queryFn: () => gameService.search(submitted, 12),
    enabled: submitted.length > 0,
  });

  const selected = useMemo(() => {
    const keptSaved = saved.filter((game) => !removedIds.includes(game.steamAppid));
    const fresh = addedIds
      .filter((id) => !saved.some((game) => game.steamAppid === id))
      .map((id) => pickedItems[id])
      .filter((game): game is UserFavoriteGame => Boolean(game));
    return [...fresh, ...keptSaved];
  }, [saved, addedIds, removedIds, pickedItems]);

  const isSelected = useCallback(
    (steamAppid: number) => {
      if (addedIds.includes(steamAppid)) return true;
      if (removedIds.includes(steamAppid)) return false;
      return saved.some((game) => game.steamAppid === steamAppid);
    },
    [addedIds, removedIds, saved],
  );

  const togglePicked = useCallback(
    (item: GameSearchItem | UserFavoriteGame) => {
      const game = toFavorite(item);

      if (saved.some((savedGame) => savedGame.steamAppid === game.steamAppid)) {
        setRemovedIds((prev) =>
          prev.includes(game.steamAppid)
            ? prev.filter((id) => id !== game.steamAppid)
            : [...prev, game.steamAppid],
        );
      } else {
        setAddedIds((prev) =>
          prev.includes(game.steamAppid)
            ? prev.filter((id) => id !== game.steamAppid)
            : [...prev, game.steamAppid],
        );
      }

      setPickedItems((prev) => ({ ...prev, [game.steamAppid]: game }));
    },
    [saved],
  );

  const pickSource = useCallback((next: ProfileSource) => {
    setSource(next);
    setStep(next === 'manual-games' ? 'games' : 'build');
  }, []);

  const submitSearch = useCallback(
    (value: string) => {
      setSubmitted(value.trim());
    },
    [],
  );

  const restart = useCallback(() => {
    setStep('source');
    setSource(null);
    setStarted(false);
  }, []);

  const startBuild = useCallback(async () => {
    if (!source) return false;

    const ok = await onBuild({
      source,
      appIds: source === 'manual-games' ? selected.map((game) => game.steamAppid) : undefined,
    });
    if (ok) setStarted(true);
    return ok;
  }, [onBuild, source, selected]);

  const back = useCallback(() => {
    if (step === 'games') setStep('source');
    else if (step === 'build' && !started) setStep(source === 'manual-games' ? 'games' : 'source');
  }, [step, started, source]);

  return {
    step,
    source,
    started,
    input,
    setInput,
    submitted,
    selected,
    isSelected,
    togglePicked,
    pickSource,
    submitSearch,
    startBuild,
    back,
    restart,
    searchQuery,
    favoritesLoading: favoritesQuery.isPending,
    canBuild: selected.length >= MIN_FAVORITE_GAMES && selected.length <= MAX_FAVORITE_GAMES,
    minGames: MIN_FAVORITE_GAMES,
    maxGames: MAX_FAVORITE_GAMES,
  };
}
