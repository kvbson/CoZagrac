/**
 * OpenAI embedding-cost report (rozdz. 6.2 pracy) from the persisted daily
 * usage counters (embedding_usage_daily - counters survive restarts).
 *
 * Cost = tokens x PRICE_PER_1M_TOKENS; the sentinel row
 * (user_id = 00000000-...) is the global one and is reported separately.
 *
 * Run from apps/backend (needs .env + DB):
 *   npx tsx src/functions/evaluation/catalogCostReport.ts
 * Results: docs/pomiary/catalog-cost-<date>.md
 */
import { sql } from 'drizzle-orm';
import { db } from '../../db/init.js';
import { writeReport } from './report.js';

/** OpenAI text-embedding-3-small list price, USD per 1M tokens */
const PRICE_PER_1M_TOKENS = 0.02;

type UsageRow = { day: string; user_id: string; tokens: string; profile_builds: number };

const mdTable = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

async function main() {
  const result = await db.execute<UsageRow>(
    sql`SELECT day::text AS day, user_id::text AS user_id, tokens, profile_builds
        FROM embedding_usage_daily
        ORDER BY day ASC, user_id ASC`,
  );

  if (result.rows.length === 0) {
    console.log('[COST] No usage rows in embedding_usage_daily.');
    await db.$client.end?.();
    return;
  }

  const cost = (tokens: number) => `$${((tokens / 1_000_000) * PRICE_PER_1M_TOKENS).toFixed(4)}`;

  const perDay = new Map<string, { tokens: number; builds: number }>();
  let totalTokens = 0;
  let totalBuilds = 0;

  for (const row of result.rows) {
    const day = perDay.get(row.day) ?? { tokens: 0, builds: 0 };
    day.tokens += Number(row.tokens);
    day.builds += row.profile_builds;
    perDay.set(row.day, day);
    totalTokens += Number(row.tokens);
    totalBuilds += row.profile_builds;
  }

  const markdown = [
    `# Catalog embedding cost report (${new Date().toISOString().slice(0, 10)})`,
    '',
    `Price assumption: $${PRICE_PER_1M_TOKENS} per 1M tokens (text-embedding-3-small).`,
    '',
    mdTable(
      ['Day', 'Tokens', 'Profile builds', 'Cost'],
      [...perDay.entries()].map(([day, d]) => [day, d.tokens, d.builds, cost(d.tokens)]),
    ),
    '',
    mdTable(
      ['Total', 'Tokens', 'Profile builds', 'Cost'],
      [['all days', totalTokens, totalBuilds, cost(totalTokens)]],
    ),
    '',
    `_Note: token counters start when usage logging was introduced; days before that are not represented._`,
  ].join('\n');

  await writeReport('catalog-cost', markdown);
  await db.$client.end?.();
}

main().catch((err) => {
  console.error('[COST] failed:', err);
  process.exit(1);
});
