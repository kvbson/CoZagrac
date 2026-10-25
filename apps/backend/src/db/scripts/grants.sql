-- Minimum grants for the CoZagrac application role (app_user).
--
-- Bootstrap order on a fresh database (all scripts in this folder):
--   1) createdb <db>                        (superuser)
--   2) extensions.sql                       (superuser)
--   3) bootstrap_schema.sql                 (schema; admin role or superuser)
--   4) post_migrate.sql                     (superuser or table owner)
--   5) grants.sql                           (this file, superuser)
--   6) verify.sql                           (read-only checklist)
--
-- Rationale (verified against the codebase):
--  - the runtime needs DML only; it executes no DDL (checkDbConnection is
--    "SELECT 1"; connect-pg-simple does NOT create the sessions table because
--    createTableIfMissing is not enabled),
--  - extension objects (vector type/operators/HNSW, gen_random_uuid) and the
--    search-vector trigger function rely on the default PUBLIC EXECUTE/USAGE,
--    so nothing extra is required for them,
--  - the schema has no sequences (uuid PKs + Steam appids), so sequence
--    privileges are not needed,
--  - app_user must NOT get CREATE on the public schema: migrations stay on
--    the admin role.
--
-- Client-agnostic plain SQL. BEFORE RUNNING, replace every CHANGE_ME with the
-- real app_user password (the literal CHANGE_ME is the reminder guard - never
-- commit a real password into this file). Example psql run without putting the
-- secret in shell history:
--   sed "s/CHANGE_ME/$APP_USER_PASSWORD/g" grants.sql | psql "$ADMIN_DATABASE_URL" -f -

BEGIN;

-- 1) Role: LOGIN only (no SUPERUSER/CREATEDB/CREATEROLE). Idempotent.
DO $$
BEGIN
  CREATE ROLE app_user LOGIN;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'role app_user already exists - password will be updated';
END
$$;

ALTER ROLE app_user LOGIN PASSWORD 'CHANGE_ME';

-- 2) Schema usage + full DML on the application tables
--    (list = bootstrap_schema.sql, 20 tables).
GRANT USAGE ON SCHEMA public TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  users,
  user_providers,
  sessions,
  user_embeddings,
  user_favorite_games,
  embedding_usage_daily,
  game_embeddings,
  game_info,
  game_reviews,
  genres,
  categories,
  tags,
  game_genres,
  game_categories,
  game_screenshots,
  game_movies,
  game_publishers,
  user_genres,
  user_categories,
  user_tags
TO app_user;

-- 3) Keep app_user usable on tables created by later migrations
--    (applies to objects created by the admin role that runs this script).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

COMMIT;

-- =====================================================================
-- VARIANT 2 (optional, commented out): split the API role from the ETL role
-- used by manual sync scripts (tsx functions/sync/*). Apply INSTEAD of
-- section 2 above and point the sync scripts' DATABASE_URL at sync_user:
--
-- CREATE ROLE sync_user LOGIN PASSWORD '...';
-- GRANT USAGE ON SCHEMA public TO app_user, sync_user;
--
-- -- app_user: full DML on user data + sessions, read-only game catalog
-- GRANT SELECT, INSERT, UPDATE, DELETE ON
--   users, user_providers, sessions, user_embeddings, user_favorite_games,
--   embedding_usage_daily,
--   user_genres, user_categories, user_tags
--   TO app_user;
-- GRANT SELECT ON
--   game_info, game_reviews, game_embeddings,
--   genres, categories, tags,
--   game_genres, game_categories, game_screenshots, game_movies,
--   game_publishers
--   TO app_user;
--
-- -- sync_user: ETL on the game catalog only, no access to user data
-- GRANT SELECT, INSERT, UPDATE, DELETE ON
--   game_info, game_reviews, game_embeddings,
--   genres, categories, tags,
--   game_genres, game_categories, game_screenshots, game_movies,
--   game_publishers
--   TO sync_user;
--
-- NOTE: with Variant 2, the ALTER DEFAULT PRIVILEGES in section 3 must be
-- narrowed accordingly after each new migration.
-- =====================================================================
