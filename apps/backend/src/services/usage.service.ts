import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db/init.js';
import { embeddingUsageDaily } from '../drizzle/schema.js';
import { env } from '../env.js';
import {
  buildsStatus,
  dayKeyUtc,
  GLOBAL_USAGE_USER_ID,
  tokenBudgetStatus,
} from '../utils/usage.helpers.js';

const upsertTokens = (day: string, userId: string, tokens: number) =>
  db
    .insert(embeddingUsageDaily)
    .values({ day, userId, tokens })
    .onConflictDoUpdate({
      target: [embeddingUsageDaily.day, embeddingUsageDaily.userId],
      set: { tokens: sql`${embeddingUsageDaily.tokens} + excluded.tokens` },
    });

async function readUsed(day: string, userId: string): Promise<number> {
  const [row] = await db
    .select({ tokens: embeddingUsageDaily.tokens })
    .from(embeddingUsageDaily)
    .where(and(eq(embeddingUsageDaily.day, day), eq(embeddingUsageDaily.userId, userId)))
    .limit(1);

  return row?.tokens ?? 0;
}

/**
 * Daily OpenAI usage accounting (see docs plan): one row per (day, user)
 * plus a global row (GLOBAL_USAGE_USER_ID). Exact token counts come from
 * response.usage of every embeddings.create call; profile builds are
 * counted at job start so retries cannot farm free rebuilds.
 */
export const usageService = {
  /** Books tokens for the user row (when known) and always the global row. */
  async addTokens(userId: string | null, tokens: number) {
    if (tokens <= 0) return;
    const day = dayKeyUtc();

    await Promise.all([
      upsertTokens(day, GLOBAL_USAGE_USER_ID, tokens),
      userId ? upsertTokens(day, userId, tokens) : Promise.resolve(),
    ]);
  },

  /**
   * null when embedding calls for this user may proceed, otherwise a
   * user-facing reason. userId null = batch/admin (global budget only).
   */
  async tokenBudgetProblem(userId: string | null): Promise<'user' | 'global' | null> {
    const day = dayKeyUtc();
    const usedGlobal = await readUsed(day, GLOBAL_USAGE_USER_ID);
    const usedUser = userId ? await readUsed(day, userId) : 0;

    const status = tokenBudgetStatus({
      usedUser,
      usedGlobal,
      limitUser: userId ? env.OPENAI_TOKENS_USER_DAY : Number.POSITIVE_INFINITY,
      limitGlobal: env.OPENAI_TOKENS_GLOBAL_DAY,
    });

    return status.reason;
  },

  /** Daily profile-build counter (all sources - protects Steam API + jobs). */
  async buildsProblem(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ builds: embeddingUsageDaily.profileBuilds })
      .from(embeddingUsageDaily)
      .where(and(eq(embeddingUsageDaily.day, dayKeyUtc()), eq(embeddingUsageDaily.userId, userId)))
      .limit(1);

    return !buildsStatus(row?.builds ?? 0, env.USER_PROFILE_BUILDS_PER_DAY).ok;
  },

  /** Counted BEFORE the job starts so a crash/retry cannot refill the quota. */
  async incrementBuilds(userId: string) {
    const day = dayKeyUtc();
    await db
      .insert(embeddingUsageDaily)
      .values({ day, userId, profileBuilds: 1 })
      .onConflictDoUpdate({
        target: [embeddingUsageDaily.day, embeddingUsageDaily.userId],
        set: {
          profileBuilds: sql`${embeddingUsageDaily.profileBuilds} + 1`,
        },
      });
  },

  /** Removes per-user usage rows with the account (table has no FK). */
  async deleteUserRows(userId: string) {
    await db.delete(embeddingUsageDaily).where(eq(embeddingUsageDaily.userId, userId));
  },

  /**
   * Storage minimisation (RODO): drops usage history older than
   * USAGE_RETENTION_DAYS. Started once at boot and every 24h in index.ts;
   * returns the number of removed rows for logging.
   */
  async cleanupOldRows(): Promise<number> {
    const cutoff = dayKeyUtc(new Date(Date.now() - env.USAGE_RETENTION_DAYS * 86_400_000));
    console.log(cutoff);
    const removed = await db
      .delete(embeddingUsageDaily)
      .where(lt(embeddingUsageDaily.day, cutoff))
      .returning({ day: embeddingUsageDaily.day });

    return removed.length;
  },
};
