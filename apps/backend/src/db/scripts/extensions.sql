-- Extensions required by the CoZagrac schema.
--
-- Run as a superuser BEFORE creating the schema (drizzle-kit push/migrate),
-- because embedding columns reference the "vector" type. drizzle introspection
-- does NOT capture extensions, so this file is the source of truth for them
-- (the legacy postgre_schema.sql listed the same; kept only for reference).
--
--   psql "$ADMIN_DATABASE_URL" -f apps/backend/src/db/scripts/extensions.sql

\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- report what is now installed (verify.sql cross-checks this)
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pgcrypto', 'vector')
ORDER BY extname;
