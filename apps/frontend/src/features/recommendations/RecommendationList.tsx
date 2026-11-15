import type { RecommendationItem } from '@cozagrac/shared/contracts/api';
import { RecommendationCard } from './RecommendationCard';
import { useRatings } from './useRatings';

export function RecommendationList({ items }: { items: RecommendationItem[] }) {
  const { rate } = useRatings();

  return (
    <div className="rec-grid">
      {items.map((item) => (
        <RecommendationCard
          key={item.steamAppid}
          item={item}
          onRate={(rating) => rate(item.steamAppid, rating)}
        />
      ))}
    </div>
  );
}
