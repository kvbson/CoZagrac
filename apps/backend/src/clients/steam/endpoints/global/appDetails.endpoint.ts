import { getReviewTier, recommendationsThresholds } from '../../../../functions/getReviewTier.js';
import { CreateGameInput } from '../../../../schemas/game.zod.js';
import { GetAppDetailsResponse } from '../../../../types/response.js';
import steamStoreHttp from '../../steamStore.client.js';

type AppDetailsEndpointParams = {
  appids: string;
};

export const appDetailsEndpoint = {
  getData(appId: string) {
    const params: AppDetailsEndpointParams = { appids: appId };

    return steamStoreHttp.get<GetAppDetailsResponse>(`api/appdetails`, {
      params,
    });
  },
};

export function mapAppDetailsToCreateGameInput(res: GetAppDetailsResponse): CreateGameInput {
  const appid = parseInt(Object.keys(res)[0], 10);
  const data = res[appid].data;
  if (!data) {
    throw new Error(`No data found for appid ${appid}`);
  }
  if (!appid) {
    throw new Error(`No appid found in response`);
  }
  const recommendationsCount = data.recommendations?.total || 0;
  if (!recommendationsCount || recommendationsCount < recommendationsThresholds.B) {
    throw new Error(`Insufficient recommendations (${recommendationsCount}) for appid ${appid}`);
  }
  const reviewTier = getReviewTier(recommendationsCount);
  return {
    game: {
      steamAppid: appid,
      name: data.name,
      shortDescription: data.short_description,
      detailedDescription: data.detailed_description,
      aboutTheGame: data.about_the_game,

      headerImage: data.header_image,
      capsuleImage: data.capsule_image,
      background: data.background,

      releaseDate: data.release_date?.date || null,
      releaseComingSoon: data.release_date?.coming_soon ?? false,

      isFree: data.is_free,
      requiredAge: parseInt(data.required_age, 10) || 0,
      website: data.website ?? null,
      appUrl: `https://store.steampowered.com/app/${appid}`,

      priceCurrency: data.price_overview?.currency ?? null,
      priceInitial: data.price_overview?.initial ?? null,
      priceFinal: data.price_overview?.final ?? null,
      priceInitialFormatted: data.price_overview?.initial_formatted ?? null,
      priceFinalFormatted: data.price_overview?.final_formatted ?? null,
      priceDiscountPercent: data.price_overview?.discount_percent ?? 0,

      platformWindows: !!data.platforms?.windows,
      platformLinux: !!data.platforms?.linux,
      platformMac: !!data.platforms?.mac,

      pcMinimum: data.pc_requirements?.minimum ?? null,
      pcRecommended: data.pc_requirements?.recommended ?? null,
      linuxMinimum: data.linux_requirements?.minimum ?? null,
      linuxRecommended: data.linux_requirements?.recommended ?? null,
      macMinimum: data.mac_requirements?.minimum ?? null,
      macRecommended: data.mac_requirements?.recommended ?? null,
      reviewTier: reviewTier,
    },

    genres: data.genres ?? [],
    categories: data.categories ?? [],

    publishers: (data.publishers ?? []).map((name: string, idx: number) => ({
      publisherId: idx,
      name,
    })),

    movies: (data.movies ?? []).map((m: any) => ({
      movieId: m.id,
      name: m.name,
      url: m.webm?.max ?? m.mp4?.max,
      thumbnail: m.thumbnail,
    })),

    screenshots: (data.screenshots ?? []).map((s: any) => ({
      screenshotId: s.id,
      pathFull: s.path_full,
      pathThumbnail: s.path_thumbnail,
    })),
  };
}
