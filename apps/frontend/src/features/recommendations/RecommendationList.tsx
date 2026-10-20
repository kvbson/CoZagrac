import type { RecommendationItem } from '@cozagrac/shared/contracts/api';
import { RecommendationCard } from './RecommendationCard';

export function RecommendationList({ items }: { items: RecommendationItem[] }) {
  return (
    <div className="rec-grid">
      {items.map((item) => (
        <RecommendationCard key={item.steamAppid} item={item} />
      ))}
    </div>
  );
}
