-- Read-only checklist: does this database match what the app expects?
-- Expected state (derived from src/drizzle + code analysis):
--   2 extensions, 18 tables, 1 non-extension function, 1 user trigger,
--   vector type from the extension, 24 custom indexes (2 HNSW + 1 GIN),
--   0 sequences, DML grants for app_user on all tables.
--
--   psql "$ADMIN_DATABASE_URL" -f apps/backend/src/db/scripts/verify.sql

\set ON_ERROR_STOP on

\echo '=== 1. extensions: expect pgcrypto + vector ==='
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pgcrypto', 'vector')
ORDER BY extname;

\echo '=== 2. tables: expect count = 18 ==='
SELECT count(*) AS tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

\echo '=== 3. functions NOT owned by extensions: expect exactly game_info_search_vector_update ==='
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_depend d
    WHERE d.classid = 'pg_proc'::regclass
      AND d.objid = p.oid
      AND d.refclassid = 'pg_extension'::regclass
  )
ORDER BY 1;

\echo '=== 4. aggregates (all should come from pgvector): informational ==='
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'a'
ORDER BY 1;

\echo '=== 5. user triggers: expect exactly trg_game_info_search_vector ==='
SELECT tgname, tgrelid::regclass AS on_table
FROM pg_trigger
WHERE NOT tgisinternal
ORDER BY 1;

\echo '=== 6. types provided by extensions (vector expected) ==='
SELECT e.extname, t.typname
FROM pg_type t
JOIN pg_depend d ON d.classid = 'pg_type'::regclass
  AND d.objid = t.oid
  AND d.refclassid = 'pg_extension'::regclass
JOIN pg_extension e ON e.oid = d.refobjid
WHERE t.typname NOT LIKE '\_%'
ORDER BY 1, 2;

\echo '=== 7. custom indexes: expect count = 24 ==='
SELECT count(*) AS custom_indexes
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx\_%';

\echo '=== 7b. non-btree indexes: expect 2 hnsw + 1 gin ==='
SELECT c.relname, am.amname
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_am am ON am.oid = c.relam
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND am.amname <> 'btree'
ORDER BY 1;

\echo '=== 8. sequences: expect count = 0 ==='
SELECT count(*) AS sequences
FROM information_schema.sequences
WHERE sequence_schema = 'public';

\echo '=== 9. drift guard vs legacy postgre_schema.sql: expect 6 columns ==='
SELECT table_name || '.' || column_name AS column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'game_info' AND column_name IN ('search_vector', 'is_candidate', 'review_tier'))
    OR (table_name IN ('game_embeddings', 'user_embeddings') AND column_name = 'embedding_version')
    OR (table_name = 'game_reviews' AND column_name = 'review_created')
  )
ORDER BY 1;

\echo '=== 10. app_user privileges: expect grants = 4 (SELECT/INSERT/UPDATE/DELETE) per table ==='
SELECT c.relname,
       (SELECT count(*)
        FROM information_schema.role_table_grants g
        WHERE g.grantee = 'app_user'
          AND g.table_schema = 'public'
          AND g.table_name = c.relname
          AND g.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
       ) AS grants
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY 1;
