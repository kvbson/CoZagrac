import { Link } from 'react-router-dom';
import type { RecommendationItem } from '@cozagrac/shared/contracts/api';
import { Card } from '../../components/ui/Card';

export function RecommendationCard({ item }: { item: RecommendationItem }) {
  const storeUrl = `https://store.steampowered.com/app/${item.steamAppid}`;

  return (
    <Card>
      <Link to={`/games/${item.steamAppid}`}>
        {item.headerImage ? (
          <img className="card__img" src={item.headerImage} alt="" loading="lazy" />
        ) : (
          <div className="card__img card__img--empty">No image</div>
        )}
      </Link>

      <div className="card__body">
        <h3>
          <Link to={`/games/${item.steamAppid}`}>{item.name}</Link>
        </h3>

        <div className="card__meta">
          <span className="badge badge--match">{Math.round(item.similarity * 100)}% match</span>

          {item.isFree ? (
            <span className="badge">Free to Play</span>
          ) : item.priceFinalFormatted ? (
            <span className="badge">{item.priceFinalFormatted}</span>
          ) : null}

          {item.priceDiscountPercent ? (
            <span className="badge badge--sale">-{item.priceDiscountPercent}%</span>
          ) : null}
        </div>

        <a href={storeUrl} target="_blank" rel="noreferrer">
          View on Steam
        </a>
      </div>
    </Card>
  );
}
