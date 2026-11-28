import type { RecommendationItem } from '@cozagrac/shared/contracts/api';
import { RecommendationCard } from './RecommendationCard';
import { useRatings } from './useRatings';

export function RecommendationList({ items }: { items: RecommendationItem[] }) {
  const { ratings, rate, remove } = useRatings();

  return (
    <div className="rec-grid">
      {items.map((item) => (
        <RecommendationCard
          key={item.steamAppid}
          item={item}
          rating={ratings.get(item.steamAppid)}
          onRate={(rating) => rate(item.steamAppid, rating)}
          onRemove={
            ratings.get(item.steamAppid) !== undefined
              ? () => remove(item.steamAppid)
              : undefined
          }
        />
      ))}
    </div>
  );
}
