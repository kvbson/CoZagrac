import steamHttp from '../../steam.client.js';

type GetOwnedGamesResponse = {
  response:
    | {
        game_count: number;
        games:
          | Array<{
              appid: number;
              name: string;
              playtime_forever: number;
              img_icon_url: string;
              has_community_visible_stats: boolean;
              playtime_windows_forever: number;
              playtime_mac_forever: number;
              playtime_linux_forever: number;
              playtime_deck_forever: number;
              rtime_last_played: number;
              content_descriptorids: number[];
              playtime_disconnected: number;
            }>
          | undefined;
      }
    | undefined;
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
