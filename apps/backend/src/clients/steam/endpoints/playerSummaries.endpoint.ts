import steamHttp from '@api/clients/steam/steam.client.js';

type GetPlayerSummariesResponse = {
  response: {
    players: Array<{
      steamid: string;
      personaname: string;
      avatarfull: string;
    }>;
  };
};

export const playerSummariesEndpoint = {
  getData(steamIds: string[]) {
    return steamHttp.get<GetPlayerSummariesResponse>('/ISteamUser/GetPlayerSummaries/v0002/', {
      params: {
        steamids: steamIds.join(','),
      },
    });
  },
};
