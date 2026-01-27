import { GetAppReviewsResponse } from '../../../../types/response.js';
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

export const appReviewsEndpoint = {
  getData(appId: string) {
    const params: AppReviewsEndpointParams = {
      json: 1,
      language: 'all',
      purchase_type: 'all',
      num_per_page: 0,
    };

    return steamStoreHttp.get<GetAppReviewsResponse>(`appreviews/${appId}`, {
      params,
    });
  },
};

// const MIN_TOTAL_REVIEWS = 500;
// const MIN_POSITIVE_RATIO = 0.7;

// function qualifyByReviews(res: GetAppReviewsResponse) {
//   if (!res.success) return null;

//   const summary = res.query_summary;
//   const total = summary.total_reviews;

//   if (total < MIN_TOTAL_REVIEWS) return null;

//   const positiveRatio = summary.total_positive / total;

//   if (positiveRatio < MIN_POSITIVE_RATIO) return null;

//   return {
//     reviewCount: total,
//     positiveRatio,
//     scoreDesc: summary.review_score_desc,
//   };
// }
