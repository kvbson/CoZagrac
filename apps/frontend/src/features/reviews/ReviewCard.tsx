import type { GameReviewItem } from '@cozagrac/shared/contracts/api';

function formatPlaytime(minutes: number): string {
  if (!minutes) return '<1 h';
  const hours = minutes / 60;
  return hours < 1 ? '<1 h' : `${Math.round(hours)} h`;
}

export function ReviewCard({ review }: { review: GameReviewItem }) {
  return (
    <article className={`review-card ${review.votedUp ? 'review-card--up' : 'review-card--down'}`}>
      <header className="review-card__meta">
        <span className={`badge ${review.votedUp ? 'badge--match' : 'badge--negative'}`}>
          {review.votedUp ? 'Positive' : 'Negative'}
        </span>

        <span className="muted">{formatPlaytime(review.playtimeForever)} played</span>

        {review.steamPurchase && <span className="muted">purchased</span>}

        {review.reviewCreated && <span className="muted">{review.reviewCreated}</span>}

        {review.votesUp ? <span className="muted">👍 {review.votesUp}</span> : null}

        {review.votesFunny ? <span className="muted">😂 {review.votesFunny}</span> : null}

        {review.commentCount ? <span className="muted">💬 {review.commentCount}</span> : null}

        {review.language && review.language !== 'english' ? (
          <span className="muted">{review.language}</span>
        ) : null}
      </header>

      <p className="review-card__text">{review.review}</p>
    </article>
  );
}
