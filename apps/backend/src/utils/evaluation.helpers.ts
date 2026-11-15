/**
 * Recommendation-quality metrics for the evaluation scripts (leave-one-out
 * and explicit-feedback variants). Pure functions - unit-testable, no DB.
 *
 * A "rank" is the 1-based position of the held-out game in the kNN result,
 * or null when it did not make it into the top-K list.
 */

/** fraction of test games found in top-K */
export function hitRateAtK(ranks: (number | null)[], k: number): number {
  if (ranks.length === 0) return 0;
  const hits = ranks.filter((rank) => rank !== null && rank <= k).length;
  return hits / ranks.length;
}

/** mean of 1/rank (miss = 0) - sensitive to top positions */
export function mrr(ranks: (number | null)[]): number {
  if (ranks.length === 0) return 0;
  const sum = ranks.reduce<number>((acc, rank) => acc + (rank === null ? 0 : 1 / rank), 0);
  return sum / ranks.length;
}

/**
 * NDCG contribution of a single relevant item at `rank`:
 *   1 / log2(rank + 1)  when rank <= k, else 0
 * (one relevant item per query, so IDCG is constant and normalizes to 1).
 */
export function ndcgSingleRelevant(rank: number | null, k: number): number {
  if (rank === null || rank > k) return 0;
  return 1 / Math.log2(rank + 1);
}

/** mean NDCG@k over per-query ranks of a single relevant item */
export function meanNdcgAtK(ranks: (number | null)[], k: number): number {
  if (ranks.length === 0) return 0;
  const sum = ranks.reduce<number>((acc, rank) => acc + ndcgSingleRelevant(rank, k), 0);
  return sum / ranks.length;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** nearest-rank percentile (values need not be sorted; input not mutated) */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

/** fraction of `approx` top-k appids present in the exact top-k list */
export function recallAtK(approx: number[], exact: number[], k: number): number {
  const exactSet = new Set(exact.slice(0, k));
  const topApprox = approx.slice(0, k);
  if (topApprox.length === 0) return 0;
  const hits = topApprox.filter((id) => exactSet.has(id)).length;
  return hits / topApprox.length;
}
