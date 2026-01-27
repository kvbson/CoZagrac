import steamHttp from '../../steam.client.js';

type GetUserStatsResponse = {
  playerstats: {
    steamID: string;
    gameName: string;
    achievements: Array<{
      apiname: string;
      achieved: number; // 0 or 1
      unlocktime: number;
    }>;
    stats: Array<{
      name: string;
      value: number;
    }>;
  };
};

export const userStatsEndpoint = {
  getData(steamid: string, appid: string) {
    return steamHttp.get<GetUserStatsResponse>('ISteamUserStats/GetUserStatsForGame/v2', {
      params: {
        steamid,
        appid,
      },
    });
  },
};
