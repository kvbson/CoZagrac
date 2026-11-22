import { Link } from 'react-router-dom';
import type { RecommendationItem } from '@cozagrac/shared/contracts/api';
import { RatingSlider } from '../../components/ui/RatingSlider';
import { GameTable } from '../games/GameTable';
import type { GameColumn } from '../games/GameTable';
import { useRatings } from './useRatings';

/** Details (table) view of recommendations. Uses the same useRatings()
 * feedback loop as the grid: a rated game drops out of the list. */
export function RecommendationsTable({ items }: { items: RecommendationItem[] }) {
  const { ratings, rate, ratingPending } = useRatings();

  const columns: GameColumn<RecommendationItem>[] = [
    {
      id: 'name',
      label: 'Name',
      sortValue: (item) => item.name.toLowerCase(),
      render: (item) => (
        <span className="gametable__name">
          {item.headerImage && (
            <Link to={`/games/${item.steamAppid}`}>
              <img className="gametable__img" src={item.headerImage} alt="" loading="lazy" />
            </Link>
          )}
          <Link to={`/games/${item.steamAppid}`}>{item.name}</Link>
        </span>
      ),
    },
    {
      id: 'similarity',
      label: 'Match',
      sortValue: (item) => item.similarity,
      render: (item) => (
        <span className="badge badge--match">{Math.round(item.similarity * 100)}% match</span>
      ),
    },
    {
      id: 'price',
      label: 'Price',
      render: (item) =>
        item.isFree ? (
          <span className="badge">Free to Play</span>
        ) : item.priceFinalFormatted ? (
          item.priceFinalFormatted
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      id: 'discount',
      label: 'Discount',
      sortValue: (item) => item.priceDiscountPercent ?? 0,
      render: (item) =>
        item.priceDiscountPercent ? (
          <span className="badge badge--sale">-{item.priceDiscountPercent}%</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      id: 'reviewTier',
      label: 'Reviews',
      render: (item) =>
        item.reviewTier ? (
          <span className="badge" title="Popularity tier (review count)">
            {item.reviewTier}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      id: 'rating',
      label: 'Your rating',
      render: (item) => (
        <RatingSlider
          rating={ratings.get(item.steamAppid)}
          onRate={(value) => rate(item.steamAppid, value)}
          label={item.name}
          disabled={ratingPending}
        />
      ),
    },
    {
      id: 'steam',
      label: 'Steam',
      render: (item) => (
        <a
          href={`https://store.steampowered.com/app/${item.steamAppid}`}
          target="_blank"
          rel="noreferrer"
        >
          View on Steam
        </a>
      ),
    },
  ];

  return <GameTable columns={columns} rows={items} getRowKey={(item) => item.steamAppid} />;
}
