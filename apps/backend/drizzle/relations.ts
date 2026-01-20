import { relations } from "drizzle-orm/relations";
import { gameInfo, gameEmbeddings, users, userEmbeddings, sessions, gameGenres, genres, gameCategories, categories, userGenres, userCategories, userTags, tags, gamePublishers, gameScreenshots, gameMovies, gameReviews } from "./schema";

export const gameEmbeddingsRelations = relations(gameEmbeddings, ({one}) => ({
	gameInfo: one(gameInfo, {
		fields: [gameEmbeddings.steamAppid],
		references: [gameInfo.steamAppid]
	}),
}));

export const gameInfoRelations = relations(gameInfo, ({many}) => ({
	gameEmbeddings: many(gameEmbeddings),
	gameGenres: many(gameGenres),
	gameCategories: many(gameCategories),
	gamePublishers: many(gamePublishers),
	gameScreenshots: many(gameScreenshots),
	gameMovies: many(gameMovies),
	gameReviews: many(gameReviews),
}));

export const userEmbeddingsRelations = relations(userEmbeddings, ({one}) => ({
	user: one(users, {
		fields: [userEmbeddings.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userEmbeddings: many(userEmbeddings),
	sessions: many(sessions),
	userGenres: many(userGenres),
	userCategories: many(userCategories),
	userTags: many(userTags),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const gameGenresRelations = relations(gameGenres, ({one}) => ({
	gameInfo: one(gameInfo, {
		fields: [gameGenres.steamAppid],
		references: [gameInfo.steamAppid]
	}),
	genre: one(genres, {
		fields: [gameGenres.genreId],
		references: [genres.id]
	}),
}));

export const genresRelations = relations(genres, ({many}) => ({
	gameGenres: many(gameGenres),
	userGenres: many(userGenres),
}));

export const gameCategoriesRelations = relations(gameCategories, ({one}) => ({
	gameInfo: one(gameInfo, {
		fields: [gameCategories.steamAppid],
		references: [gameInfo.steamAppid]
	}),
	category: one(categories, {
		fields: [gameCategories.categoryId],
		references: [categories.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	gameCategories: many(gameCategories),
	userCategories: many(userCategories),
}));

export const userGenresRelations = relations(userGenres, ({one}) => ({
	user: one(users, {
		fields: [userGenres.userId],
		references: [users.id]
	}),
	genre: one(genres, {
		fields: [userGenres.genreId],
		references: [genres.id]
	}),
}));

export const userCategoriesRelations = relations(userCategories, ({one}) => ({
	user: one(users, {
		fields: [userCategories.userId],
		references: [users.id]
	}),
	category: one(categories, {
		fields: [userCategories.categoryId],
		references: [categories.id]
	}),
}));

export const userTagsRelations = relations(userTags, ({one}) => ({
	user: one(users, {
		fields: [userTags.userId],
		references: [users.id]
	}),
	tag: one(tags, {
		fields: [userTags.tagId],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	userTags: many(userTags),
}));

export const gamePublishersRelations = relations(gamePublishers, ({one}) => ({
	gameInfo: one(gameInfo, {
		fields: [gamePublishers.steamAppid],
		references: [gameInfo.steamAppid]
	}),
}));

export const gameScreenshotsRelations = relations(gameScreenshots, ({one}) => ({
	gameInfo: one(gameInfo, {
		fields: [gameScreenshots.steamAppid],
		references: [gameInfo.steamAppid]
	}),
}));

export const gameMoviesRelations = relations(gameMovies, ({one}) => ({
	gameInfo: one(gameInfo, {
		fields: [gameMovies.steamAppid],
		references: [gameInfo.steamAppid]
	}),
}));

export const gameReviewsRelations = relations(gameReviews, ({one}) => ({
	gameInfo: one(gameInfo, {
		fields: [gameReviews.steamAppid],
		references: [gameInfo.steamAppid]
	}),
}));