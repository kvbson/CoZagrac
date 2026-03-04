import { CreateReviewInput } from '../../../../schemas/review.zod.js';
import { logger } from '../../../../utils/logger.js';
import steamStoreHttp from '../../steamStore.client.js';

type AppReviewsEndpointParams = {
  json: number;
  filter?: string;
  language?: string;
  day_range?: string;
  review_type?: string; //all, positive, negative
  purchase_type?: string; //all, steam, non_steam
  cursor?: string; // *, base64 encoded string
  num_per_page?: number;
};

type EndpointParams = {
  appId: string;
  cursor?: string;
  reviewType?: 'positive' | 'negative' | 'all';
};

type EndpointResponse = {
  success: number;
  query_summary: {
    num_reviews: number;
    review_score: number;
    review_score_desc: string;
    total_positive: number;
    total_negative: number;
    total_reviews: number;
  };
  reviews: {
    recommendationid: string;
    author: {
      steamid: string;
      num_games_owned: number;
      num_reviews: number;
      playtime_forever: number;
      playtime_last_two_weeks: number;
      playtime_at_review: number;
      last_played: number;
    };
    language: string;
    review: string;
    timestamp_created: number;
    timestamp_updated: number;
    voted_up: boolean;
    votes_up: number;
    votes_funny: number;
    weighted_vote_score: string;
    comment_count: number;
    steam_purchase: boolean;
    received_for_free: boolean;
    written_during_early_access: boolean;
    primarily_steam_deck: boolean;
  }[];
  cursor: string;
};

export const appReviewsEndpoint = {
  getData({ appId, reviewType = 'all', cursor }: EndpointParams) {
    const params: AppReviewsEndpointParams = {
      json: 1,
      num_per_page: 100,
      day_range: '365',
      review_type: reviewType,
      filter: 'all',
      cursor,
    };
    console.log(steamStoreHttp.getUri({ url: `appreviews/${appId}`, params }));
    return steamStoreHttp.get<EndpointResponse>(`appreviews/${appId}`, {
      params,
    });
  },
};

function safeInt(value: number, max = 2_147_483_647): number {
  if (value > max) return max;
  if (value < -max) return -max;
  return value;
}

export const mapAppReviewsToCreateReviewInput = (
  reviews: EndpointResponse['reviews'],
  appId: number,
): CreateReviewInput[] => {
  const out: CreateReviewInput[] = [];

  for (const r of reviews) {
    try {
      const recommendationId = parseInt(r.recommendationid, 10);
      if (!recommendationId || recommendationId <= 0) {
        throw new Error(`Invalid recommendationId: ${r.recommendationid}`);
      }

      const ts = r.timestamp_created;
      if (!ts || ts <= 0) {
        throw new Error(`Invalid timestamp_created: ${r.timestamp_created}`);
      }

      const reviewCreated = new Date(ts * 1000).toISOString();

      const weightedVoteScore = parseFloat(r.weighted_vote_score);
      if (Number.isNaN(weightedVoteScore)) {
        throw new Error(`Invalid weighted_vote_score: ${r.weighted_vote_score}`);
      }

      out.push({
        steamAppid: appId,
        recommendationId,
        review: r.review,
        votedUp: r.voted_up,
        votesUp: safeInt(r.votes_up),
        votesFunny: safeInt(r.votes_funny),
        weightedVoteScore,
        commentCount: safeInt(r.comment_count),
        steamPurchase: r.steam_purchase,
        playtimeForever: safeInt(r.author.playtime_forever),
        reviewCreated,
        language: r.language,
      });
    } catch (err: unknown) {
      logger.error('Failed to map review from Steam', err);
      continue;
    }
  }

  return out;
};
