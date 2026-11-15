-- Extensions required by the CoZagrac schema.
--
-- Run BEFORE creating the schema (drizzle-kit push/migrate or
-- bootstrap_schema.sql), because embedding columns reference the "vector"
-- type. drizzle introspection does NOT capture extensions, so this file is
-- the source of truth for them (the legacy postgre_schema.sql listed the same;
-- kept only for reference).
--
-- Client-agnostic plain SQL: run with psql -f OR paste into pgAdmin/QEditor.
-- Requires a superuser (or a role with CREATE EXTENSION privileges).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- report what is now installed (verify.sql cross-checks this)
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pgcrypto', 'vector')
ORDER BY extname;
