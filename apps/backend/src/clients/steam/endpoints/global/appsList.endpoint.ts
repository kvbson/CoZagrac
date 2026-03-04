import { GetAppsListResponse } from '../../../../types/response.js';
import { steamRequest } from '../../../../utils/steamRequest.js';
import steamHttp from '../../steam.client.js';

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
  getData(lastAppid?: number) {
    const params: AppsListEndpointParams = {
      include_games: true,
      include_dlcs: false,
      include_software: false,
      include_videos: false,
      include_hardware: false,
      last_appid: lastAppid,
      // max_results: 10000,
    };

    return steamHttp.get<GetAppsListResponse>('/IStoreService/GetAppList/v1/', {
      params,
    });
  },
};

export async function* iterateAppList(batchSize = 10_000) {
  let lastAppid = 0;

  while (true) {
    console.log(`[APPLIST] fetching from last_appid=${lastAppid}`);

    const res = await steamRequest(() => appsListEndpoint.getData(lastAppid));

    const apps = res.response.apps;
    if (!apps.length) break;

    yield apps.slice(0, batchSize);

    lastAppid = apps[apps.length - 1].appid;
  }
}
