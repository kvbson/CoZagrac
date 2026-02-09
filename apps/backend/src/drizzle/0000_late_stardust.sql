-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_genre_id" integer,
	"name" varchar,
	CONSTRAINT "uq_genres_steam_genre_id" UNIQUE("steam_genre_id"),
	CONSTRAINT "genres_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "game_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_appid" integer NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model_name" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"embedding_version" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_category_id" integer,
	"name" varchar,
	CONSTRAINT "uq_categories_steam_category_id" UNIQUE("steam_category_id"),
	CONSTRAINT "categories_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model_name" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"embedding_version" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_id" varchar,
	"email" varchar,
	"password_hash" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_steam_id_key" UNIQUE("steam_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_tag_id" integer,
	"name" varchar,
	CONSTRAINT "uq_tags_steam_tag_id" UNIQUE("steam_tag_id"),
	CONSTRAINT "tags_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"sess" jsonb NOT NULL,
	"expire" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_info" (
	"steam_appid" integer PRIMARY KEY NOT NULL,
	"name" varchar,
	"short_description" text,
	"detailed_description" text,
	"about_the_game" text,
	"is_free" boolean,
	"required_age" integer,
	"platform_windows" boolean,
	"platform_mac" boolean,
	"platform_linux" boolean,
	"header_image" varchar,
	"capsule_image" varchar,
	"background" varchar,
	"website" varchar,
	"app_url" varchar,
	"release_coming_soon" boolean,
	"release_date" text,
	"price_currency" varchar,
	"price_initial" integer,
	"price_final" integer,
	"price_initial_formatted" varchar,
	"price_final_formatted" varchar,
	"price_discount_percent" integer,
	"pc_minimum" text,
	"pc_recommended" text,
	"mac_minimum" text,
	"mac_recommended" text,
	"linux_minimum" text,
	"linux_recommended" text,
	"search_vector" "tsvector",
	"is_candidate" boolean,
	"review_tier" varchar(1)
);
--> statement-breakpoint
CREATE TABLE "game_genres" (
	"steam_appid" integer NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "game_genres_pkey" PRIMARY KEY("steam_appid","genre_id")
);
--> statement-breakpoint
CREATE TABLE "user_genres" (
	"user_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "user_genres_pkey" PRIMARY KEY("user_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "user_categories" (
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "user_categories_pkey" PRIMARY KEY("user_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"user_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "user_tags_pkey" PRIMARY KEY("user_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "game_categories" (
	"steam_appid" integer NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "game_categories_pkey" PRIMARY KEY("steam_appid","category_id")
);
--> statement-breakpoint
CREATE TABLE "game_publishers" (
	"steam_appid" integer NOT NULL,
	"publisher_id" integer NOT NULL,
	"name" varchar,
	CONSTRAINT "game_publishers_pkey" PRIMARY KEY("steam_appid","publisher_id")
);
--> statement-breakpoint
CREATE TABLE "game_screenshots" (
	"steam_appid" integer NOT NULL,
	"screenshot_id" integer NOT NULL,
	"path_thumbnail" varchar,
	"path_full" varchar,
	CONSTRAINT "game_screenshots_pkey" PRIMARY KEY("steam_appid","screenshot_id")
);
--> statement-breakpoint
CREATE TABLE "game_movies" (
	"steam_appid" integer NOT NULL,
	"movie_id" integer NOT NULL,
	"name" varchar,
	"thumbnail" varchar,
	"url" varchar,
	CONSTRAINT "game_movies_pkey" PRIMARY KEY("steam_appid","movie_id")
);
--> statement-breakpoint
CREATE TABLE "game_reviews" (
	"steam_appid" integer NOT NULL,
	"recommendation_id" integer NOT NULL,
	"review" text,
	"voted_up" boolean,
	"votes_up" integer,
	"votes_funny" integer,
	"weighted_vote_score" double precision,
	"playtime_forever" integer DEFAULT 0 NOT NULL,
	"steam_purchase" boolean,
	"comment_count" integer,
	"review_created" date,
	"language" varchar(50),
	CONSTRAINT "game_reviews_pkey" PRIMARY KEY("steam_appid","recommendation_id")
);
--> statement-breakpoint
ALTER TABLE "game_embeddings" ADD CONSTRAINT "game_embeddings_steam_appid_fkey" FOREIGN KEY ("steam_appid") REFERENCES "public"."game_info"("steam_appid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_embeddings" ADD CONSTRAINT "user_embeddings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_steam_appid_fkey" FOREIGN KEY ("steam_appid") REFERENCES "public"."game_info"("steam_appid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_genres" ADD CONSTRAINT "user_genres_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_genres" ADD CONSTRAINT "user_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_steam_appid_fkey" FOREIGN KEY ("steam_appid") REFERENCES "public"."game_info"("steam_appid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_publishers" ADD CONSTRAINT "game_publishers_steam_appid_fkey" FOREIGN KEY ("steam_appid") REFERENCES "public"."game_info"("steam_appid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_screenshots" ADD CONSTRAINT "game_screenshots_steam_appid_fkey" FOREIGN KEY ("steam_appid") REFERENCES "public"."game_info"("steam_appid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_movies" ADD CONSTRAINT "game_movies_steam_appid_fkey" FOREIGN KEY ("steam_appid") REFERENCES "public"."game_info"("steam_appid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_reviews" ADD CONSTRAINT "game_reviews_steam_appid_fkey" FOREIGN KEY ("steam_appid") REFERENCES "public"."game_info"("steam_appid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_embeddings_steam_appid" ON "game_embeddings" USING btree ("steam_appid" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_game_embeddings_vector" ON "game_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_game_embeddings_version" ON "game_embeddings" USING btree ("embedding_version" text_ops);--> statement-breakpoint
CREATE INDEX "idx_user_embeddings_user_id" ON "user_embeddings" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_embeddings_vector" ON "user_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_user_embeddings_version" ON "user_embeddings" USING btree ("embedding_version" text_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_expire" ON "sessions" USING btree ("expire" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_game_info_is_candidate" ON "game_info" USING btree ("is_candidate" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_game_info_is_free" ON "game_info" USING btree ("is_free" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_game_info_release_date" ON "game_info" USING btree ("release_date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_game_info_search_vector" ON "game_info" USING gin ("search_vector" tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_game_genres_genre_id" ON "game_genres" USING btree ("genre_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_game_genres_steam_appid" ON "game_genres" USING btree ("steam_appid" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_genres_user_id" ON "user_genres" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_categories_user_id" ON "user_categories" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_tags_user_id" ON "user_tags" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_game_categories_category_id" ON "game_categories" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_game_categories_steam_appid" ON "game_categories" USING btree ("steam_appid" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_game_publishers_steam_appid" ON "game_publishers" USING btree ("steam_appid" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_game_screenshots_steam_appid" ON "game_screenshots" USING btree ("steam_appid" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_game_movies_steam_appid" ON "game_movies" USING btree ("steam_appid" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_appid_created" ON "game_reviews" USING btree ("steam_appid" int4_ops,"review_created" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_appid_voted_up" ON "game_reviews" USING btree ("steam_appid" bool_ops,"voted_up" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_appid_weighted" ON "game_reviews" USING btree ("steam_appid" float8_ops,"weighted_vote_score" int4_ops);--> statement-breakpoint
CREATE VIEW "public"."genre_names_for_game_view" AS (SELECT steam_appid, ( SELECT array_agg(g.name ORDER BY g.name) AS array_agg FROM game_genres gg JOIN genres g ON g.id = gg.genre_id WHERE gg.steam_appid = gi.steam_appid) AS genres FROM game_info gi WHERE name::text = 'Shadow of the Tomb Raider: Definitive Edition'::text);
*/