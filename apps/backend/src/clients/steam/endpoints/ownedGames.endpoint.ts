import steamHttp from '@/clients/steam/steam.client.js';

type GetOwnedGamesResponse = {
  response: {
    game_count: number;
    games: Array<{
      appid: number;
      playtime_forever: number;
    }>;
  };
};

export const ownedGamesEndpoint = {
  getData(steamId: string) {
    return steamHttp.get<GetOwnedGamesResponse>('/IPlayerService/GetOwnedGames/v0001/', {
      params: {
        steamid: steamId,
        include_appinfo: true,
      },
    });
  },
};
