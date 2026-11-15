-- Migration: user_game_ratings (explicit 1-5 game ratings). Users rate
-- recommendation cards and library entries; 4-5 pull the profile centroid
-- toward the game (Rocchio-style correction), 1-2 push it away, 3 is neutral.
-- Apply on EXISTING dev/prod databases; a fresh database already gets the
-- table from bootstrap_schema.sql.
--
-- Run as the admin role (app_user has no DDL), same procedure as
-- bootstrap_schema.sql (see docs/wdrozenie_aplikacji_vps.md).
-- Idempotent - safe to re-run.
--
-- After applying, re-run verify.sql (expect: 21 tables, 26 custom indexes)
-- and grants.sql if the app_user grants section was re-run from scratch.

BEGIN;
SET LOCAL search_path TO public;

CREATE TABLE IF NOT EXISTS user_game_ratings (
  user_id uuid NOT NULL,
  steam_appid integer NOT NULL,
  rating smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, steam_appid),
  CONSTRAINT user_game_ratings_rating_check CHECK (rating BETWEEN 1 AND 5)
);

-- ADD CONSTRAINT has no IF NOT EXISTS; guard via to_regclass first (the
-- constraints can only be missing on a freshly created table).
DO $$
BEGIN
  IF to_regclass('public.user_game_ratings') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'user_game_ratings_user_id_fkey'
     ) THEN
    ALTER TABLE user_game_ratings ADD CONSTRAINT user_game_ratings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.user_game_ratings') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'user_game_ratings_steam_appid_fkey'
     ) THEN
    ALTER TABLE user_game_ratings ADD CONSTRAINT user_game_ratings_steam_appid_fkey
      FOREIGN KEY (steam_appid) REFERENCES game_info(steam_appid) ON DELETE CASCADE;
  END IF;
END
$$;

-- user_id side is covered by the PK prefix (user_id, steam_appid)
CREATE INDEX IF NOT EXISTS idx_user_game_ratings_steam_appid
  ON user_game_ratings (steam_appid);

-- keep app_user DML-able on the new table (ALTER DEFAULT PRIVILEGES in
-- grants.sql only covers tables created AFTER it ran, by the same role)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_game_ratings TO app_user;
  END IF;
END
$$;

COMMIT;
