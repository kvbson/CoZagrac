import {
  pgTable,
  unique,
  uuid,
  integer,
  varchar,
  index,
  foreignKey,
  vector,
  timestamp,
  jsonb,
  text,
  boolean,
  primaryKey,
  doublePrecision,
  date,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const genres = pgTable(
  'genres',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    steamGenreId: integer('steam_genre_id'),
    name: varchar(),
  },
  (table) => [
    unique('uq_genres_steam_genre_id').on(table.steamGenreId),
    unique('genres_name_key').on(table.name),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    steamCategoryId: integer('steam_category_id'),
    name: varchar(),
  },
  (table) => [
    unique('uq_categories_steam_category_id').on(table.steamCategoryId),
    unique('categories_name_key').on(table.name),
  ],
);

export const gameEmbeddings = pgTable(
  'game_embeddings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    steamAppid: integer('steam_appid').notNull(),
    embedding: vector({ dimensions: 1536 }).notNull(),
    modelName: varchar('model_name'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_game_embeddings_steam_appid').using(
      'btree',
      table.steamAppid.asc().nullsLast().op('int4_ops'),
    ),
    index('idx_game_embeddings_vector').using(
      'hnsw',
      table.embedding.asc().nullsLast().op('vector_cosine_ops'),
    ),
    foreignKey({
      columns: [table.steamAppid],
      foreignColumns: [gameInfo.steamAppid],
      name: 'game_embeddings_steam_appid_fkey',
    }).onDelete('cascade'),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    steamId: varchar('steam_id'),
    email: varchar(),
    passwordHash: varchar('password_hash'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [unique('users_steam_id_key').on(table.steamId)],
);

export const userEmbeddings = pgTable(
  'user_embeddings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    embedding: vector({ dimensions: 1536 }).notNull(),
    modelName: varchar('model_name'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_user_embeddings_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_user_embeddings_vector').using(
      'hnsw',
      table.embedding.asc().nullsLast().op('vector_cosine_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_embeddings_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    steamTagId: integer('steam_tag_id'),
    name: varchar(),
  },
  (table) => [
    unique('uq_tags_steam_tag_id').on(table.steamTagId),
    unique('tags_name_key').on(table.name),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: varchar().primaryKey().notNull(),
    userId: uuid('user_id'),
    sess: jsonb().notNull(),
    expire: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_sessions_expire').using(
      'btree',
      table.expire.asc().nullsLast().op('timestamptz_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'sessions_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const gameInfo = pgTable(
  'game_info',
  {
    steamAppid: integer('steam_appid').primaryKey().notNull(),
    name: varchar(),
    shortDescription: text('short_description'),
    detailedDescription: text('detailed_description'),
    aboutTheGame: text('about_the_game'),
    isFree: boolean('is_free'),
    requiredAge: integer('required_age'),
    platformWindows: boolean('platform_windows'),
    platformMac: boolean('platform_mac'),
    platformLinux: boolean('platform_linux'),
    headerImage: varchar('header_image'),
    capsuleImage: varchar('capsule_image'),
    background: varchar(),
    website: varchar(),
    appUrl: varchar('app_url'),
    releaseComingSoon: boolean('release_coming_soon'),
    releaseDate: text('release_date'),
    priceCurrency: varchar('price_currency'),
    priceInitial: integer('price_initial'),
    priceFinal: integer('price_final'),
    priceInitialFormatted: varchar('price_initial_formatted'),
    priceFinalFormatted: varchar('price_final_formatted'),
    priceDiscountPercent: integer('price_discount_percent'),
    pcMinimum: text('pc_minimum'),
    pcRecommended: text('pc_recommended'),
    macMinimum: text('mac_minimum'),
    macRecommended: text('mac_recommended'),
    linuxMinimum: text('linux_minimum'),
    linuxRecommended: text('linux_recommended'),
    // TODO: failed to parse database type 'tsvector'
    searchVector: text('search_vector'),
    isCandidate: boolean('is_candidate'),
    reviewTier: varchar('review_tier', { length: 1 }),
  },
  (table) => [
    index('idx_game_info_is_candidate').using(
      'btree',
      table.isCandidate.asc().nullsLast().op('bool_ops'),
    ),
    index('idx_game_info_is_free').using('btree', table.isFree.asc().nullsLast().op('bool_ops')),
    index('idx_game_info_release_date').using(
      'btree',
      table.releaseDate.asc().nullsLast().op('text_ops'),
    ),
    index('idx_game_info_search_vector').using(
      'gin',
      table.searchVector.asc().nullsLast().op('tsvector_ops'),
    ),
  ],
);

export const prismaMigrations = pgTable('_prisma_migrations', {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  checksum: varchar({ length: 64 }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
  migrationName: varchar('migration_name', { length: 255 }).notNull(),
  logs: text(),
  rolledBackAt: timestamp('rolled_back_at', { withTimezone: true, mode: 'string' }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  appliedStepsCount: integer('applied_steps_count').default(0).notNull(),
});

export const gameGenres = pgTable(
  'game_genres',
  {
    steamAppid: integer('steam_appid').notNull(),
    genreId: uuid('genre_id').notNull(),
  },
  (table) => [
    index('idx_game_genres_genre_id').using(
      'btree',
      table.genreId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_game_genres_steam_appid').using(
      'btree',
      table.steamAppid.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.steamAppid],
      foreignColumns: [gameInfo.steamAppid],
      name: 'game_genres_steam_appid_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.genreId],
      foreignColumns: [genres.id],
      name: 'game_genres_genre_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.steamAppid, table.genreId], name: 'game_genres_pkey' }),
  ],
);

export const userGenres = pgTable(
  'user_genres',
  {
    userId: uuid('user_id').notNull(),
    genreId: uuid('genre_id').notNull(),
  },
  (table) => [
    index('idx_user_genres_user_id').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_genres_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.genreId],
      foreignColumns: [genres.id],
      name: 'user_genres_genre_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.userId, table.genreId], name: 'user_genres_pkey' }),
  ],
);

export const userCategories = pgTable(
  'user_categories',
  {
    userId: uuid('user_id').notNull(),
    categoryId: uuid('category_id').notNull(),
  },
  (table) => [
    index('idx_user_categories_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_categories_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'user_categories_category_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.userId, table.categoryId], name: 'user_categories_pkey' }),
  ],
);

export const userTags = pgTable(
  'user_tags',
  {
    userId: uuid('user_id').notNull(),
    tagId: uuid('tag_id').notNull(),
  },
  (table) => [
    index('idx_user_tags_user_id').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_tags_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tagId],
      foreignColumns: [tags.id],
      name: 'user_tags_tag_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.userId, table.tagId], name: 'user_tags_pkey' }),
  ],
);

export const gameCategories = pgTable(
  'game_categories',
  {
    steamAppid: integer('steam_appid').notNull(),
    categoryId: uuid('category_id').notNull(),
  },
  (table) => [
    index('idx_game_categories_category_id').using(
      'btree',
      table.categoryId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_game_categories_steam_appid').using(
      'btree',
      table.steamAppid.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.steamAppid],
      foreignColumns: [gameInfo.steamAppid],
      name: 'game_categories_steam_appid_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'game_categories_category_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.steamAppid, table.categoryId], name: 'game_categories_pkey' }),
  ],
);

export const gamePublishers = pgTable(
  'game_publishers',
  {
    steamAppid: integer('steam_appid').notNull(),
    publisherId: integer('publisher_id').notNull(),
    name: varchar(),
  },
  (table) => [
    index('idx_game_publishers_steam_appid').using(
      'btree',
      table.steamAppid.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.steamAppid],
      foreignColumns: [gameInfo.steamAppid],
      name: 'game_publishers_steam_appid_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.steamAppid, table.publisherId], name: 'game_publishers_pkey' }),
  ],
);

export const gameScreenshots = pgTable(
  'game_screenshots',
  {
    steamAppid: integer('steam_appid').notNull(),
    screenshotId: integer('screenshot_id').notNull(),
    pathThumbnail: varchar('path_thumbnail'),
    pathFull: varchar('path_full'),
  },
  (table) => [
    index('idx_game_screenshots_steam_appid').using(
      'btree',
      table.steamAppid.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.steamAppid],
      foreignColumns: [gameInfo.steamAppid],
      name: 'game_screenshots_steam_appid_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.steamAppid, table.screenshotId], name: 'game_screenshots_pkey' }),
  ],
);

export const gameMovies = pgTable(
  'game_movies',
  {
    steamAppid: integer('steam_appid').notNull(),
    movieId: integer('movie_id').notNull(),
    name: varchar(),
    thumbnail: varchar(),
    url: varchar(),
  },
  (table) => [
    index('idx_game_movies_steam_appid').using(
      'btree',
      table.steamAppid.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.steamAppid],
      foreignColumns: [gameInfo.steamAppid],
      name: 'game_movies_steam_appid_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.steamAppid, table.movieId], name: 'game_movies_pkey' }),
  ],
);

export const gameReviews = pgTable(
  'game_reviews',
  {
    steamAppid: integer('steam_appid').notNull(),
    recommendationId: integer('recommendation_id').notNull(),
    review: text(),
    votedUp: boolean('voted_up'),
    votesUp: integer('votes_up'),
    votesFunny: integer('votes_funny'),
    weightedVoteScore: doublePrecision('weighted_vote_score'),
    steamPurchase: boolean('steam_purchase'),
    commentCount: integer('comment_count'),
    reviewCreated: date('review_created'),
  },
  (table) => [
    index('idx_game_reviews_steam_appid').using(
      'btree',
      table.steamAppid.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.steamAppid],
      foreignColumns: [gameInfo.steamAppid],
      name: 'game_reviews_steam_appid_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.steamAppid, table.recommendationId], name: 'game_reviews_pkey' }),
  ],
);
