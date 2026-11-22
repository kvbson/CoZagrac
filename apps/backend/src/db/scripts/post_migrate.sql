-- Database objects that drizzle does NOT manage.
--
-- drizzle-kit introspect only captures tables/columns/indexes, so the
-- search-vector trigger function and trigger are NOT present in
-- src/drizzle/*.sql migrations. Run this script AFTER extensions.sql and
-- AFTER the schema exists (drizzle-kit push/migrate). It is idempotent, so
-- it is safe to re-run on every deploy.
--
-- Client-agnostic plain SQL: run with psql -f OR paste into pgAdmin/QEditor.
-- The explicit transaction makes the whole script atomic.

BEGIN;

-- Full-text search support for game_info (see idx_game_info_search_vector GIN).
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

-- CREATE OR REPLACE TRIGGER (PostgreSQL 14+): idempotent re-run without the
-- "trigger does not exist, skipping" NOTICE that noisy clients (pgAdmin F5) choke on.
CREATE OR REPLACE TRIGGER trg_game_info_search_vector
BEFORE INSERT OR UPDATE
ON game_info
FOR EACH ROW
EXECUTE FUNCTION game_info_search_vector_update();

-- Backfill rows written before the trigger was installed.
UPDATE game_info
SET search_vector = to_tsvector(
  'english',
  coalesce(name, '') || ' ' ||
  coalesce(short_description, '') || ' ' ||
  coalesce(about_the_game, '') || ' ' ||
  coalesce(detailed_description, '')
)
WHERE search_vector IS NULL;

-- Profile-basis source (steam-library | manual-games) persisted on the
-- embedding so GET /user/me/recommendations/explain survives restarts.
-- NULL for profiles built before this column existed (explain falls back
-- to inferring the source from user_favorite_games).
ALTER TABLE user_embeddings ADD COLUMN IF NOT EXISTS source varchar(32);

COMMIT;
