/**
 * Pure budget logic for the daily OpenAI quota (embedding_usage_daily).
 * Kept DB-free so it can be unit-tested without a database.
 */

/** user_id of the global (all-traffic) usage row - a uuid that can never
 * collide with a real user row; the table has no FK by design (see
 * bootstrap_schema.sql) */
export const GLOBAL_USAGE_USER_ID = '00000000-0000-0000-0000-000000000000';

/** usage day key, UTC - quotas reset at midnight UTC */
export const dayKeyUtc = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

export type TokenBudgetStatus = {
  ok: boolean;
  /** which budget is exhausted when !ok ('user' only when a user was given) */
  reason: 'user' | 'global' | null;
  userLeft: number;
  globalLeft: number;
};

/**
 * Budgets are checked as "any tokens left at all" before each API call;
 * the exact usage is booked from response.usage afterwards, so the cap can
 * be overshot by at most one in-flight call (a single game embedding, <=~40k).
 */
export function tokenBudgetStatus(input: {
  usedUser: number;
  usedGlobal: number;
  limitUser: number;
  limitGlobal: number;
}): TokenBudgetStatus {
  const userLeft = Math.max(0, input.limitUser - input.usedUser);
  const globalLeft = Math.max(0, input.limitGlobal - input.usedGlobal);

  if (globalLeft <= 0) return { ok: false, reason: 'global', userLeft, globalLeft };
  if (userLeft <= 0) return { ok: false, reason: 'user', userLeft, globalLeft };

  return { ok: true, reason: null, userLeft, globalLeft };
}

export type BuildsStatus = { ok: boolean; left: number };

export function buildsStatus(used: number, limit: number): BuildsStatus {
  const left = Math.max(0, limit - used);
  return { ok: left > 0, left };
}

/** Thrown when a call would exceed a daily quota; surfaced to the user as 429. */
export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}
