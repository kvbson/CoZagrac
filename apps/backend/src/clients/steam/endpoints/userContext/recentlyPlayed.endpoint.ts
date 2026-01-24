import steamHttp from '@api/clients/steam/steam.client.js';

type GetRecentlyPlayedGamesResponse = {
  response:
    | {
        game_count: number;
        games:
          | Array<{
              appid: number;
              name: string;
              playtime_2weeks: number;
              playtime_forever: number;
              img_icon_url: string;
              playtime_windows_forever: number;
              playtime_mac_forever: number;
              playtime_linux_forever: number;
              playtime_deck_forever: number;
            }>
          | undefined;
      }
    | undefined;
};

export const recentlyPlayedEndpoint = {
  getData(steamId: string): Promise<GetRecentlyPlayedGamesResponse> {
    return steamHttp.get<GetRecentlyPlayedGamesResponse>(
      '/IPlayerService/GetRecentlyPlayedGames/v0001/',
      {
        params: {
          steamid: steamId,
        },
      },
    );
  },
};
