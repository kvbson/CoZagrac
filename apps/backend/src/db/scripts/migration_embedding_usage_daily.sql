-- Migration: embedding_usage_daily (daily OpenAI quota counters:
-- per-account + global token budget and per-account profile-build limit).
-- Apply on EXISTING dev/prod databases; a fresh database already gets the
-- table from bootstrap_schema.sql.
--
-- Run as the admin role (app_user has no DDL), same procedure as
-- bootstrap_schema.sql (see docs/wdrozenie_aplikacji_vps.md).
-- Idempotent - safe to re-run.
--
-- After applying, re-run verify.sql (expect: 20 tables) and grants.sql if
-- the app_user grants section was re-run from scratch.
--
-- NOTE: intentionally no FK on user_id - the global row uses the sentinel
-- user_id '00000000-0000-0000-0000-000000000000'; per-account rows are
-- removed by userService.delete.

BEGIN;
SET LOCAL search_path TO public;

CREATE TABLE IF NOT EXISTS embedding_usage_daily (
  day date NOT NULL,
  user_id uuid NOT NULL,
  tokens bigint NOT NULL DEFAULT 0,
  profile_builds integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON embedding_usage_daily TO app_user;
  END IF;
END
$$;

COMMIT;
