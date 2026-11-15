import { useCallback, useContext, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MAX_FAVORITE_GAMES,
  MIN_FAVORITE_GAMES,
  type GameSearchItem,
  type ProfileSource,
  type UserFavoriteGame,
} from '@cozagrac/shared/contracts/api';
import { favoritesService } from '../../services/favoritesService';
import { gameService } from '../../services/gameService';
import { ratingsService } from '../../services/ratingsService';
import { userService } from '../../services/userService';
import { MessageContext } from '../../context/MessageContext';
import type { BuildProfileInput } from '../recommendations/useRecommendations';

export type WizardStep = 'source' | 'games' | 'rate' | 'build';

/** how many most-played games the rating step offers */
export const RATE_STEP_GAMES = 10;

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
  const queryClient = useQueryClient();
  const { showMessage } = useContext(MessageContext);

  const [step, setStep] = useState<WizardStep>('source');
  const [source, setSource] = useState<ProfileSource | null>(null);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [pickedItems, setPickedItems] = useState<Record<number, UserFavoriteGame>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesService.get(),
  });

  /** most-played catalog games for the steam-library rating step */
  const libraryQuery = useQuery({
    queryKey: ['steam-library'],
    queryFn: () => userService.getLibrary(),
    enabled: step === 'rate',
  });

  const rateCandidates = useMemo(() => {
    const items = libraryQuery.data?.userData?.items ?? [];
    return items.filter((game) => game.headerImage).slice(0, RATE_STEP_GAMES);
  }, [libraryQuery.data]);

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
    setStep(next === 'manual-games' ? 'games' : 'rate');
  }, []);

  const setRating = useCallback((steamAppid: number, rating: number) => {
    setRatings((prev) => ({ ...prev, [steamAppid]: rating }));
  }, []);

  /** games picked -> summary/build step */
  const goBuild = useCallback(() => setStep('build'), []);

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
    setRatings({});
  }, []);

  const startBuild = useCallback(async () => {
    if (!source) return false;

    // steam-library path: persist the optional rating step before the build
    // (the weighted centroid reads ratings at build time). Ratings are
    // optional - a failed save must not block the build.
    if (source === 'steam-library') {
      const entries = Object.entries(ratings);
      if (entries.length > 0) {
        const results = await Promise.allSettled(
          entries.map(([appid, rating]) => ratingsService.set(Number(appid), rating)),
        );
        if (results.some((r) => r.status === 'rejected')) {
          showMessage('error', 'Some ratings could not be saved.');
        }
        void queryClient.invalidateQueries({ queryKey: ['ratings'] });
      }
    }

    const ok = await onBuild({
      source,
      appIds: source === 'manual-games' ? selected.map((game) => game.steamAppid) : undefined,
    });
    if (ok) setStarted(true);
    return ok;
  }, [onBuild, source, selected, ratings, showMessage, queryClient]);

  const back = useCallback(() => {
    if (step === 'games' || step === 'rate') setStep('source');
    else if (step === 'build' && !started)
      setStep(source === 'manual-games' ? 'games' : 'rate');
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
    setRating,
    ratings,
    rateCandidates,
    libraryLoading: libraryQuery.isPending,
    goBuild,
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
