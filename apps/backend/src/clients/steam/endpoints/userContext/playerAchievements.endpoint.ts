import steamHttp from '../../steam.client.js';

type GetPlayerAchievementsResponse = {
  playerstats: {
    steamID: string;
    gameName: string;
    achievements: Array<{
      apiname: string;
      achieved: number; // 0 or 1
      unlocktime: number;
    }>;
  };
};

export const playerAchievementsEndpoint = {
  getData(steamid: string, appid: string) {
    return steamHttp.get<GetPlayerAchievementsResponse>(
      'ISteamUserStats/GetPlayerAchievements/v0001',
      {
        params: {
          steamid,
          appid,
        },
      },
    );
  },
};
