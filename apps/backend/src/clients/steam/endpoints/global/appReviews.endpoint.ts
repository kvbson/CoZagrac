import steamStoreHttp from '../../steamStore.client.js';

type GetAppReviewsResponse = {
  response: {
    apps: Array<{
      appid: number;
      name: string;
    }>;
    have_more_results: boolean;
    last_appid: number;
  };
};

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
    const params: AppReviewsEndpointParams = { json: 1, language: 'english', cursor: '*' };

    return steamStoreHttp.get<GetAppReviewsResponse>(`appreviews/${appId}`, {
      params,
    });
  },
};
