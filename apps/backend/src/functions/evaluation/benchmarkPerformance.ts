/**
 * Performance benchmarks for the recommendation core (rozdz. 6.2 pracy).
 *
 * All queries run on ONE dedicated pg client so session-level SETs
 * (enable_indexscan / enable_bitmapscan / hnsw.ef_search) apply to the
 * whole run - nothing is dropped or destroyed.
 *
 * Measured:
 *   1. kNN top-20 on game_embeddings: index (HNSW) vs sequential scan,
 *      p50/p95 over 100 queries (5 real profile vectors + 5 random),
 *      plus recall of the approximate index vs the exact top-20 and the
 *      ef_search 40/100 trade-off,
 *   2. FTS (websearch_to_tsquery + ts_rank): GIN index vs sequential scan,
 *   3. catalog scale stats (methodology section of the thesis).
 *
 * Run from apps/backend (needs .env + DB):
 *   npx tsx src/functions/evaluation/benchmarkPerformance.ts
 * Results: docs/pomiary/benchmark-<date>.md
 */
import { pool } from '../../db/init.js';
import { mean, percentile } from '../../utils/evaluation.helpers.js';
import { writeReport } from './report.js';
import type { PoolClient } from 'pg';

const ROUNDS = 100;
const WARMUP = 5;

type Client = PoolClient;

async function timedQueries(
  client: Client,
  sqlText: string,
  vectors: string[],
): Promise<{ times: number[]; topIds: number[][] }> {
  const times: number[] = [];
  const topIds: number[][] = [];

  for (let i = 0; i < WARMUP; i++) {
    await client.query(sqlText, [vectors[i % vectors.length]]);
  }

  for (let i = 0; i < ROUNDS; i++) {
    const vector = vectors[i % vectors.length];
    const start = performance.now();
    const result = await client.query(sqlText, [vector]);
    times.push(performance.now() - start);
    topIds.push(result.rows.map((row) => Number(row.steam_appid)));
  }

  return { times, topIds };
}

const mdTable = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

async function main() {
  const client = await pool.connect();

  try {
    // ---- catalog scale (methodology) ----
    const games = await client.query<{ count: string }>(
      'SELECT count(*) AS count FROM game_info',
    );
    const vectors = await client.query<{ count: string }>(
      "SELECT count(*) AS count FROM game_embeddings WHERE embedding_version = 'v1'",
    );
    const profiles = await client.query<{ count: string }>(
      "SELECT count(*) AS count FROM user_embeddings WHERE embedding_version = 'v2-centroid'",
    );

    // ---- query vectors: real profiles + random unit vectors ----
    const real = await client.query<{ embedding: string }>(
      "SELECT embedding::text AS embedding FROM user_embeddings WHERE embedding_version = 'v2-centroid' LIMIT 5",
    );
    const randomVectors = Array.from({ length: 5 }, () =>
      `[${Array.from({ length: 1536 }, () => (Math.random() * 2 - 1).toFixed(6)).join(',')}]`,
    );
    const queryVectors = [
      ...real.rows.map((row) => row.embedding),
      ...randomVectors,
    ];

    const knnSql =
      "SELECT steam_appid FROM game_embeddings WHERE embedding_version = 'v1' " +
      'ORDER BY embedding <=> $1::vector LIMIT 20';

    // ---- 1. kNN: HNSW index vs sequential scan ----
    await client.query('SET hnsw.ef_search = 40');
    const indexed = await timedQueries(client, knnSql, queryVectors);

    // sequential scan (exact): session-level flags require a transaction with SET LOCAL
    await client.query('BEGIN');
    await client.query('SET LOCAL enable_indexscan = off');
    const sequential = await timedQueries(client, knnSql, queryVectors);
    await client.query('COMMIT');
    await client.query('SET enable_indexscan = on');

    // exact top-20 = sequential result (no index access); recall of the
    // approximate index per query vector, plus ef_search trade-off
    const recallExact = indexed.topIds.map((ids, i) => {
      const exact = sequential.topIds[i];
      const hits = ids.filter((id) => exact.includes(id)).length;
      return hits / ids.length;
    });

    await client.query('SET hnsw.ef_search = 100');
    const ef100 = await timedQueries(client, knnSql, queryVectors);
    const recallEf100 = ef100.topIds.map((ids, i) => {
      const exact = sequential.topIds[i];
      const hits = ids.filter((id) => exact.includes(id)).length;
      return hits / ids.length;
    });
    await client.query('SET hnsw.ef_search = 40');

    // ---- 2. FTS: GIN vs sequential scan ----
    const ftsSql =
      "SELECT steam_appid FROM game_info WHERE search_vector @@ websearch_to_tsquery('english', $1) " +
      'ORDER BY ts_rank(search_vector, websearch_to_tsquery(\'english\', $1)) DESC LIMIT 10';
    const terms = ['strategy', 'shooter', 'witcher', 'colony builder', 'space simulation'];

    const ftsIndexed: number[] = [];
    const ftsSequential: number[] = [];
    for (const term of terms) {
      for (let i = 0; i < WARMUP; i++) await client.query(ftsSql, [term]);

      for (let i = 0; i < ROUNDS / terms.length; i++) {
        const start = performance.now();
        await client.query(ftsSql, [term]);
        ftsIndexed.push(performance.now() - start);
      }

      await client.query('BEGIN');
      await client.query('SET LOCAL enable_bitmapscan = off');
      await client.query('SET LOCAL enable_indexscan = off');
      for (let i = 0; i < ROUNDS / terms.length / 2; i++) {
        const start = performance.now();
        await client.query(ftsSql, [term]);
        ftsSequential.push(performance.now() - start);
      }
      await client.query('COMMIT');
    }

    const stats = (times: number[]) =>
      `p50 ${percentile(times, 50).toFixed(1)} ms / p95 ${percentile(times, 95).toFixed(1)} ms / mean ${(
        times.reduce((a, b) => a + b, 0) / times.length
      ).toFixed(1)} ms (n=${times.length})`;

    const markdown = [
      `# Performance benchmarks (${new Date().toISOString().slice(0, 10)})`,
      '',
      '## Catalog scale (methodology)',
      '',
      mdTable(
        ['Metric', 'Value'],
        [
          ['game_info rows', games.rows[0]?.count ?? '?'],
          ['game embeddings (v1)', vectors.rows[0]?.count ?? '?'],
          ['user profiles (v2-centroid)', profiles.rows[0]?.count ?? '?'],
          ['query vectors', queryVectors.length],
        ],
      ),
      '',
      '## 1. kNN top-20, 1536-dim (100 queries)',
      '',
      mdTable(
        ['Variant', 'Latency', 'Recall@20 vs exact'],
        [
          ['HNSW index (ef_search=40)', stats(indexed.times), mean(recallExact).toFixed(3)],
          ['HNSW index (ef_search=100)', stats(ef100.times), mean(recallEf100).toFixed(3)],
          ['Sequential scan (exact)', stats(sequential.times), '1.000'],
        ],
      ),
      '',
      '## 2. Full-text search, top-10 (websearch_to_tsquery + ts_rank)',
      '',
      mdTable(
        ['Variant', 'Latency'],
        [
          ['GIN index', stats(ftsIndexed)],
          ['Sequential scan', stats(ftsSequential)],
        ],
      ),
      '',
      'Hardware/software context: fill in VPS spec, PostgreSQL version, shared_buffers when writing the thesis.',
    ].join('\n');

    await writeReport('benchmark', markdown);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[BENCH] failed:', err);
  process.exit(1);
});
