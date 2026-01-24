import steamHttp from '@api/clients/steam/steam.client.js';

type GetAppsListResponse = {
  response: {
    apps: Array<{
      appid: number;
      name: string;
    }>;
    have_more_results: boolean;
    last_appid: number;
  };
};

type AppsListEndpointParams = {
  include_games: boolean;
  include_dlcs: boolean;
  include_software: boolean;
  include_videos: boolean;
  include_hardware: boolean;
  last_appid?: number;
  max_results?: number;
};

export const appsListEndpoint = {
  getData() {
    const params: AppsListEndpointParams = {
      include_games: true,
      include_dlcs: false,
      include_software: false,
      include_videos: false,
      include_hardware: false,
      // max_results: 10000,
    };

    return steamHttp.get<GetAppsListResponse>('/IStoreService/GetAppList/v1/', {
      params,
    });
  },
};
