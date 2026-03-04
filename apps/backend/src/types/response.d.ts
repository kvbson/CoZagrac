export type GetAppDetailsResponse = Record<
  string,
  {
    success: boolean;
    data: {
      type: string;
      name: string;
      steam_appid: number;
      required_age: string;
      is_free: boolean;
      controller_support: string;
      detailed_description: string;
      about_the_game: string;
      short_description: string;
      supported_languages: string;
      header_image: string;
      capsule_image: string;
      capsule_imagev5: string;
      website: string;
      pc_requirements: {
        minimum: string;
        recommended: string;
      };
      mac_requirements: {
        minimum: string;
        recommended: string;
      };
      linux_requirements: {
        minimum: string;
        recommended: string;
      };
      developers: string[];
      publishers: string[];
      price_overview?: {
        currency: string;
        initial: number;
        final: number;
        discount_percent: number;
        initial_formatted: string;
        final_formatted: string;
      };
      packages: number[];
      package_groups: Array<{
        name: string;
        title: string;
        description: string;
        selection_text: string;
        save_text: string;
        display_type: number;
        is_recurring_subscription: string;
        subs: Array<{
          packageid: number;
          percent_savings_text: string;
          percent_savings: number;
          option_text: string;
          option_description: string;
          can_get_free_license: string;
          is_free_license: string;
          price_in_cents_with_discount: number;
        }>;
      }>;
      platforms: {
        windows: boolean;
        mac: boolean;
        linux: boolean;
      };
      metacritic?: {
        score: number;
        url: string;
      };
      categories: Array<{
        id: string;
        description: string;
      }>;
      genres: Array<{
        id: string;
        description: string;
      }>;
      screenshots: Array<{
        id: number;
        path_thumbnail: string;
        path_full: string;
      }>;
      movies: Array<{
        id: number;
        name: string;
        thumbnail: string;
        dash_av1: string;
        dash_h264: string;
        hls_h264: string;
        highlight: boolean;
      }>;
      recommendations: {
        total: number;
      };
      achievements?: {
        total: number;
        highlighted: Array<{
          name: string;
          path: string;
        }>;
      };
      release_date: {
        coming_soon: boolean;
        date: string;
      };
      support_info: {
        url: string;
        email: string;
      };
      background: string;
      content_descriptors: {
        ids: number[];
        notes: string;
      };
      ratings: Record<
        string,
        {
          rating?: string;
          use_age_gate?: string;
          required_age?: string;
          banned?: string;
          rating_generated?: string;
          rating_updated?: string;
          descriptors?: string;
        }
      >;
    };
  }
>;

export type GetAppReviewsResponse = {
  response: {
    apps: Array<{
      appid: number;
      name: string;
    }>;
    have_more_results: boolean;
    last_appid: number;
  };
};

export type GetAppsListResponse = {
  response: {
    apps: Array<{
      appid: number;
      name: string;
    }>;
    have_more_results: boolean;
    last_appid: number;
  };
};
