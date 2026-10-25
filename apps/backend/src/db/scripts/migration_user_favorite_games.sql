-- Migration: user_favorite_games (manual profile basis for the
-- recommendation-source wizard). Apply on EXISTING dev/prod databases; a
-- fresh database already gets the table from bootstrap_schema.sql.
--
-- Run as the admin role (app_user has no DDL), same procedure as
-- bootstrap_schema.sql (see docs/wdrozenie_aplikacji_vps.md).
-- Idempotent - safe to re-run.
--
-- After applying, re-run verify.sql (expect: 19 tables, 25 custom indexes)
-- and grants.sql if the app_user grants section was re-run from scratch.

BEGIN;
SET LOCAL search_path TO public;

CREATE TABLE IF NOT EXISTS user_favorite_games (
  user_id uuid NOT NULL,
  steam_appid integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, steam_appid)
);

-- ADD CONSTRAINT has no IF NOT EXISTS; guard via to_regclass first (the
-- constraints can only be missing on a freshly created table).
DO $$
BEGIN
  IF to_regclass('public.user_favorite_games') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'user_favorite_games_user_id_fkey'
     ) THEN
    ALTER TABLE user_favorite_games ADD CONSTRAINT user_favorite_games_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.user_favorite_games') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'user_favorite_games_steam_appid_fkey'
     ) THEN
    ALTER TABLE user_favorite_games ADD CONSTRAINT user_favorite_games_steam_appid_fkey
      FOREIGN KEY (steam_appid) REFERENCES game_info(steam_appid) ON DELETE CASCADE;
  END IF;
END
$$;

-- user_id side is covered by the PK prefix (user_id, steam_appid)
CREATE INDEX IF NOT EXISTS idx_user_favorite_games_steam_appid
  ON user_favorite_games (steam_appid);

-- keep app_user DML-able on the new table (ALTER DEFAULT PRIVILEGES in
-- grants.sql only covers tables created AFTER it ran, by the same role)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_favorite_games TO app_user;
  END IF;
END
$$;

COMMIT;
