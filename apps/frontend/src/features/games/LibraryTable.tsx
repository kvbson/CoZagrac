import { Link } from 'react-router-dom';
import type { UserLibraryGame } from '@cozagrac/shared/contracts/api';
import { RatingSlider } from '../../components/ui/RatingSlider';
import { GameTable } from './GameTable';
import type { GameColumn } from './GameTable';
import { formatPlaytime } from './playtime';

type Props = {
  games: UserLibraryGame[];
  /** persisted ratings from the page's useRatings() instance */
  ratings: Map<number, number>;
  onRate: (steamAppid: number, rating: number) => void;
  ratingPending: boolean;
};

/** Details (table) view of the Steam library. Games outside our catalog get
 * a "not in catalog" badge and no rating slider (consistent with the grid). */
export function LibraryTable({ games, ratings, onRate, ratingPending }: Props) {
  const columns: GameColumn<UserLibraryGame>[] = [
    {
      id: 'name',
      label: 'Name',
      sortValue: (game) => game.name.toLowerCase(),
      render: (game) =>
        game.headerImage ? (
          <Link to={`/games/${game.steamAppid}`}>{game.name}</Link>
        ) : (
          <span>
            {game.name} <span className="badge">not in catalog</span>
          </span>
        ),
    },
    {
      id: 'playtime',
      label: 'Playtime',
      sortValue: (game) => game.playtimeForever,
      render: (game) => formatPlaytime(game.playtimeForever),
    },
    {
      id: 'rating',
      label: 'Your rating',
      render: (game) =>
        game.headerImage ? (
          <RatingSlider
            rating={ratings.get(game.steamAppid)}
            onRate={(value) => onRate(game.steamAppid, value)}
            label={game.name}
            disabled={ratingPending}
          />
        ) : (
          <span className="muted">—</span>
        ),
    },
  ];

  return (
    <GameTable
      columns={columns}
      rows={games}
      getRowKey={(game) => game.steamAppid}
      initialSort={{ id: 'playtime', dir: 'desc' }}
    />
  );
}
