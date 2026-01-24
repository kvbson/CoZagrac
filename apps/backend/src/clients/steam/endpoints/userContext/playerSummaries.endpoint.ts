import steamHttp from '@api/clients/steam/steam.client.js';

type GetPlayerSummariesResponse = {
  response:
    | {
        players:
          | Array<{
              steamid: string;
              personaname: string;
              communityvisibilitystate: number;
              profilestate: number;
              avatar: string;
              avatarmedium: string;
              avatarfull: string;
              avatarhash: string;
              lastlogoff: number;
              personastate: number;
              primaryclanid: string;
              timecreated: number;
              personastateflags: number;
              loccountrycode: string;
            }>
          | undefined;
      }
    | undefined;
};

export const playerSummariesEndpoint = {
  getData(steamId: string) {
    return steamHttp.get<GetPlayerSummariesResponse>('/ISteamUser/GetPlayerSummaries/v0002/', {
      params: {
        steamids: steamId,
      },
    });
  },
};
