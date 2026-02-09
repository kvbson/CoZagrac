--TODO: przejrzeć maxLengthy varcharów

BEGIN;
SET search_path TO public;
-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_id varchar UNIQUE,
  email varchar,
  password_hash varchar,
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN users.steam_id
IS 'nullable - user may connect Steam later';

-- =========================
-- GAME INFO
-- =========================
CREATE TABLE IF NOT EXISTS game_info (
  steam_appid integer PRIMARY KEY,
  name varchar,
  short_description text,
  detailed_description text,
  about_the_game text,

  is_free boolean,
  required_age integer,

  platform_windows boolean,
  platform_mac boolean,
  platform_linux boolean,

  header_image varchar,
  capsule_image varchar,
  background varchar,
  website varchar,
  app_url varchar,

  release_coming_soon boolean,
  release_date text,

  price_currency varchar,
  price_initial integer,
  price_final integer,
  price_initial_formatted varchar,
  price_final_formatted varchar,
  price_discount_percent integer,

  pc_minimum text,
  pc_recommended text,
  mac_minimum text,
  mac_recommended text,
  linux_minimum text,
  linux_recommended text
);

-- =========================
-- GAME REVIEWS
-- =========================
CREATE TABLE IF NOT EXISTS game_reviews (
  steam_appid integer NOT NULL,
  recommendation_id integer NOT NULL,
  review text,
  voted_up boolean,
  votes_up integer,
  votes_funny integer,
  weighted_vote_score float,
  playtime_forever integer NOT NULL DEFAULT 0,
  steam_purchase boolean,
  comment_count integer,
  review_created date,
  language varchar(50),
  PRIMARY KEY (steam_appid, recommendation_id),
  FOREIGN KEY (steam_appid)
    REFERENCES game_info (steam_appid)
    ON DELETE CASCADE
);
-- =========================
-- TAXONOMY
-- =========================
CREATE TABLE IF NOT EXISTS genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_genre_id integer NOT NULL UNIQUE,
  name varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_category_id integer NOT NULL UNIQUE,
  name varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_tag_id integer NOT NULL UNIQUE,
  name varchar NOT NULL
);

-- =========================
-- GAME <-> TAXONOMY
-- =========================
CREATE TABLE IF NOT EXISTS game_genres (
  steam_appid integer NOT NULL,
  genre_id uuid NOT NULL,

  PRIMARY KEY (steam_appid, genre_id),
  FOREIGN KEY (steam_appid)
    REFERENCES game_info (steam_appid)
    ON DELETE CASCADE,
  FOREIGN KEY (genre_id)
    REFERENCES genres (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_categories (
  steam_appid integer NOT NULL,
  category_id uuid NOT NULL,

  PRIMARY KEY (steam_appid, category_id),
  FOREIGN KEY (steam_appid)
    REFERENCES game_info (steam_appid)
    ON DELETE CASCADE,
  FOREIGN KEY (category_id)
    REFERENCES categories (id)
    ON DELETE CASCADE
);

-- =========================
-- MEDIA
-- =========================
CREATE TABLE IF NOT EXISTS game_screenshots (
  steam_appid integer NOT NULL,
  screenshot_id integer NOT NULL,
  path_thumbnail varchar,
  path_full varchar,

  PRIMARY KEY (steam_appid, screenshot_id),
  FOREIGN KEY (steam_appid)
    REFERENCES game_info (steam_appid)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_movies (
  steam_appid integer NOT NULL,
  movie_id integer NOT NULL,
  name varchar,
  thumbnail varchar,
  url varchar,

  PRIMARY KEY (steam_appid, movie_id),
  FOREIGN KEY (steam_appid)
    REFERENCES game_info (steam_appid)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_publishers (
  steam_appid integer NOT NULL,
  publisher_id integer NOT NULL,
  name varchar,

  PRIMARY KEY (steam_appid, publisher_id),
  FOREIGN KEY (steam_appid)
    REFERENCES game_info (steam_appid)
    ON DELETE CASCADE
);

-- =========================
-- EMBEDDINGS (pgvector)
-- =========================
CREATE TABLE IF NOT EXISTS game_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_appid integer NOT NULL,
  embedding vector(1536) NOT NULL,
  model_name varchar,
  created_at timestamptz DEFAULT now(),

  FOREIGN KEY (steam_appid)
    REFERENCES game_info (steam_appid)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  embedding vector(1536) NOT NULL,
  model_name varchar,
  created_at timestamptz DEFAULT now(),

  FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
);

-- =========================
-- USER PREFERENCES
-- =========================
CREATE TABLE IF NOT EXISTS user_genres (
  user_id uuid NOT NULL,
  genre_id uuid NOT NULL,

  PRIMARY KEY (user_id, genre_id),
  FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  FOREIGN KEY (genre_id)
    REFERENCES genres (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_categories (
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,

  PRIMARY KEY (user_id, category_id),
  FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  FOREIGN KEY (category_id)
    REFERENCES categories (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_tags (
  user_id uuid NOT NULL,
  tag_id uuid NOT NULL,

  PRIMARY KEY (user_id, tag_id),
  FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  FOREIGN KEY (tag_id)
    REFERENCES tags (id)
    ON DELETE CASCADE
);

-- =========================
-- SESSIONS
-- =========================
CREATE TABLE sessions (
  id varchar PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  sess jsonb NOT NULL,
  expire timestamptz NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions (expire);

-- =========================
-- REVIEWS INDEXES
-- =========================
-- newest first
CREATE INDEX idx_reviews_appid_created
ON game_reviews (steam_appid, review_created DESC);

-- best first
CREATE INDEX idx_reviews_appid_weighted
ON game_reviews (steam_appid, weighted_vote_score DESC);

-- positive / negative
CREATE INDEX idx_reviews_appid_voted_up
ON game_reviews (steam_appid, voted_up);

-- =========================
-- GENRES INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_game_genres_steam_appid
  ON game_genres (steam_appid);

CREATE INDEX IF NOT EXISTS idx_game_genres_genre_id
  ON game_genres (genre_id);

-- =========================
-- CATEGORIES INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_game_categories_steam_appid
  ON game_categories (steam_appid);

CREATE INDEX IF NOT EXISTS idx_game_categories_category_id
  ON game_categories (category_id);

-- =========================
-- MEDIA INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_game_screenshots_steam_appid
  ON game_screenshots (steam_appid);

CREATE INDEX IF NOT EXISTS idx_game_movies_steam_appid
  ON game_movies (steam_appid);

CREATE INDEX IF NOT EXISTS idx_game_publishers_steam_appid
  ON game_publishers (steam_appid);

-- =========================
-- GAME EMBEDDINGS
-- =========================
CREATE INDEX IF NOT EXISTS idx_game_embeddings_appid_created
ON game_embeddings (steam_appid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_embeddings_user_created
ON user_embeddings (user_id, created_at DESC);

-- =========================
-- USER PREFERENCES INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_user_genres_user_id
  ON user_genres (user_id);

CREATE INDEX IF NOT EXISTS idx_user_categories_user_id
  ON user_categories (user_id);

CREATE INDEX IF NOT EXISTS idx_user_tags_user_id
  ON user_tags (user_id);

-- =========================
-- GAME INFO INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_game_info_release_date_text
  ON game_info (release_date);

CREATE INDEX IF NOT EXISTS idx_game_info_is_free
  ON game_info (is_free);

-- =========================
-- PGVECTOR INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_game_embeddings_vector
  ON game_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_user_embeddings_vector
  ON user_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS game_embeddings_version_idx
ON game_embeddings (embedding_version);

CREATE INDEX user_embeddings_version_idx
ON user_embeddings (embedding_version);

-- =========================
-- FULL TEXT SEARCH (GAME INFO)
-- =========================

-- 1. Kolumna tsvector
ALTER TABLE game_info
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Funkcja aktualizująca search_vector
CREATE OR REPLACE FUNCTION game_info_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector(
      'english',
      coalesce(NEW.name, '') || ' ' ||
      coalesce(NEW.short_description, '') || ' ' ||
      coalesce(NEW.about_the_game, '') || ' ' ||
      coalesce(NEW.detailed_description, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger (INSERT + UPDATE)
DROP TRIGGER IF EXISTS trg_game_info_search_vector ON game_info;

CREATE TRIGGER trg_game_info_search_vector
BEFORE INSERT OR UPDATE
ON game_info
FOR EACH ROW
EXECUTE FUNCTION game_info_search_vector_update();

-- 4. Uzupełnienie istniejących danych
UPDATE game_info
SET search_vector =
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(about_the_game, '') || ' ' ||
    coalesce(detailed_description, '')
  );

-- 5. Indeks GIN
CREATE INDEX IF NOT EXISTS idx_game_info_search_vector
ON game_info
USING GIN (search_vector);

COMMIT;

-- example Text search query
-- SELECT steam_appid, name
-- FROM game_info
-- WHERE search_vector @@ plainto_tsquery('english', 'open world rpg')
-- ORDER BY ts_rank(
--   search_vector,
--   plainto_tsquery('english', 'open world rpg')
-- ) DESC
-- LIMIT 20;