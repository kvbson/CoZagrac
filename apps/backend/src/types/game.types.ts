import { gameMovies, gamePublishers, gameScreenshots } from '../drizzle/schema.js';
import { CreateGameInput } from '../schemas/game.zod.js';

export type GamePayload = {
  game: CreateGameInput;
  genres: string[];
  categories: string[];
  publishers: {
    publisherId: number;
    name?: string;
  }[];
  movies: {
    movieId: number;
    name?: string;
    thumbnail?: string;
    url?: string;
  }[];
  screenshots: {
    screenshotId: number;
    pathThumbnail?: string;
    pathFull?: string;
  }[];
  reviews: {
    recommendationId: number;
    review?: string;
    votedUp?: boolean;
    votesUp?: number;
    votesFunny?: number;
    weightedVoteScore?: number;
    steamPurchase?: boolean;
    commentCount?: number;
    reviewCreated?: string;
  }[];
};

export type GameInfoResult = {
  steamAppid: number;
  name: string;
  genres: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  movies: (typeof gameMovies.$inferSelect)[];
  publishers: (typeof gamePublishers.$inferSelect)[];
  screenshots: (typeof gameScreenshots.$inferSelect)[];
};
