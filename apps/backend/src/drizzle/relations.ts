import { relations } from 'drizzle-orm/relations';
import {
  users,
  userProviders,
  gameInfo,
  gameEmbeddings,
  userEmbeddings,
  sessions,
  gameGenres,
  genres,
  userGenres,
  userCategories,
  categories,
  userTags,
  tags,
  gameCategories,
  gamePublishers,
  gameScreenshots,
  gameMovies,
  gameReviews,
} from './schema.js';

export const userProvidersRelations = relations(userProviders, ({ one }) => ({
  user: one(users, {
    fields: [userProviders.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userProviders: many(userProviders),
  userEmbeddings: many(userEmbeddings),
  sessions: many(sessions),
  userGenres: many(userGenres),
  userCategories: many(userCategories),
  userTags: many(userTags),
}));

export const gameEmbeddingsRelations = relations(gameEmbeddings, ({ one }) => ({
  gameInfo: one(gameInfo, {
    fields: [gameEmbeddings.steamAppid],
    references: [gameInfo.steamAppid],
  }),
}));

export const gameInfoRelations = relations(gameInfo, ({ many }) => ({
  gameEmbeddings: many(gameEmbeddings),
  gameGenres: many(gameGenres),
  gameCategories: many(gameCategories),
  gamePublishers: many(gamePublishers),
  gameScreenshots: many(gameScreenshots),
  gameMovies: many(gameMovies),
  gameReviews: many(gameReviews),
}));

export const userEmbeddingsRelations = relations(userEmbeddings, ({ one }) => ({
  user: one(users, {
    fields: [userEmbeddings.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const gameGenresRelations = relations(gameGenres, ({ one }) => ({
  gameInfo: one(gameInfo, {
    fields: [gameGenres.steamAppid],
    references: [gameInfo.steamAppid],
  }),
  genre: one(genres, {
    fields: [gameGenres.genreId],
    references: [genres.id],
  }),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  gameGenres: many(gameGenres),
  userGenres: many(userGenres),
}));

export const userGenresRelations = relations(userGenres, ({ one }) => ({
  user: one(users, {
    fields: [userGenres.userId],
    references: [users.id],
  }),
  genre: one(genres, {
    fields: [userGenres.genreId],
    references: [genres.id],
  }),
}));

export const userCategoriesRelations = relations(userCategories, ({ one }) => ({
  user: one(users, {
    fields: [userCategories.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [userCategories.categoryId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  userCategories: many(userCategories),
  gameCategories: many(gameCategories),
}));

export const userTagsRelations = relations(userTags, ({ one }) => ({
  user: one(users, {
    fields: [userTags.userId],
    references: [users.id],
  }),
  tag: one(tags, {
    fields: [userTags.tagId],
    references: [tags.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  userTags: many(userTags),
}));

export const gameCategoriesRelations = relations(gameCategories, ({ one }) => ({
  gameInfo: one(gameInfo, {
    fields: [gameCategories.steamAppid],
    references: [gameInfo.steamAppid],
  }),
  category: one(categories, {
    fields: [gameCategories.categoryId],
    references: [categories.id],
  }),
}));

export const gamePublishersRelations = relations(gamePublishers, ({ one }) => ({
  gameInfo: one(gameInfo, {
    fields: [gamePublishers.steamAppid],
    references: [gameInfo.steamAppid],
  }),
}));

export const gameScreenshotsRelations = relations(gameScreenshots, ({ one }) => ({
  gameInfo: one(gameInfo, {
    fields: [gameScreenshots.steamAppid],
    references: [gameInfo.steamAppid],
  }),
}));

export const gameMoviesRelations = relations(gameMovies, ({ one }) => ({
  gameInfo: one(gameInfo, {
    fields: [gameMovies.steamAppid],
    references: [gameInfo.steamAppid],
  }),
}));

export const gameReviewsRelations = relations(gameReviews, ({ one }) => ({
  gameInfo: one(gameInfo, {
    fields: [gameReviews.steamAppid],
    references: [gameInfo.steamAppid],
  }),
}));
