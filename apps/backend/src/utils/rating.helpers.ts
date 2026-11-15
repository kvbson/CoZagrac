import { l2Normalize } from './embedding.helpers.js';

/**
 * Explicit-feedback correction of the profile centroid (Rocchio-style).
 *
 * A rating r on a game translates to a correction strength:
 *   strength(r) = |r - 3| / 2   ->  1: 1.0, 2: 0.5, 3: 0, 4: 0.5, 5: 1.0
 * Ratings 4-5 pull the centroid toward the game's embedding, 1-2 push it
 * away, 3 is neutral (skipped). Each group's contribution is the mean of
 * its embeddings SCALED by strength (weights are NOT re-normalized - a
 * rating 5 must move the centroid harder than a 4) and is applied with
 * FEEDBACK_WEIGHT; the result is L2-normalized so the corrected profile
 * stays comparable in the cosine space.
 *
 * Mirrors the negative-reviews mechanic of the game vector (weighted mean
 * with negative contribution), just applied on the user side.
 */
export const FEEDBACK_WEIGHT = 0.5;

export function ratingStrength(rating: number): number {
  return Math.abs(rating - 3) / 2;
}

/** mean of strength-scaled vectors; empty input never reaches this */
function scaledMean(items: { vec: number[]; strength: number }[], dim: number): number[] {
  const out = Array<number>(dim).fill(0);

  for (const { vec, strength } of items) {
    for (let i = 0; i < dim; i++) {
      out[i] += vec[i] * strength;
    }
  }

  return out.map((v) => v / items.length);
}

/**
 * @param base profile centroid (already L2-normalized)
 * @param rated rated games with their current catalog embeddings; vectors
 *   whose dimension differs from base are skipped (defensive: corrupted rows)
 * @returns corrected centroid, L2-normalized; base copy when nothing applies
 */
export function applyRatingCorrection(
  base: number[],
  rated: { vec: number[]; rating: number }[],
): number[] {
  const inDim = (r: { vec: number[]; rating: number }) => r.vec.length === base.length;

  const pull = rated
    .filter((r) => inDim(r) && r.rating >= 4 && r.rating <= 5)
    .map((r) => ({ vec: r.vec, strength: ratingStrength(r.rating) }));

  const push = rated
    .filter((r) => inDim(r) && r.rating >= 1 && r.rating <= 2)
    .map((r) => ({ vec: r.vec, strength: ratingStrength(r.rating) }));

  if (pull.length === 0 && push.length === 0) {
    return [...base];
  }

  const corrected = [...base];

  if (pull.length > 0) {
    const pullVec = scaledMean(pull, base.length);
    for (let i = 0; i < corrected.length; i++) {
      corrected[i] += FEEDBACK_WEIGHT * pullVec[i];
    }
  }

  if (push.length > 0) {
    const pushVec = scaledMean(push, base.length);
    for (let i = 0; i < corrected.length; i++) {
      corrected[i] -= FEEDBACK_WEIGHT * pushVec[i];
    }
  }

  return l2Normalize(corrected);
}

/**
 * Centroid weight of one game in the profile build:
 *
 *   w = (1 + log1p(playtimeMinutes)) * ratingFactor
 *
 * ratingFactor = rating / 3 when the game is rated (rating 3 = neutral 1.0,
 * 5 -> x1.67, 1 -> x0.33), 1 when unrated. The 1 + log1p playtime part
 * weights longer sessions higher while keeping zero-playtime games
 * contributing (weight >= 1), so the weighted mean never degenerates.
 * Without playtime data (manual-games basis) only the rating factor applies.
 */
export function profileWeight(playtimeMinutes: number | undefined, rating?: number): number {
  const ratingFactor = rating === undefined ? 1 : rating / 3;
  if (playtimeMinutes === undefined) {
    return ratingFactor;
  }
  const playtimeWeight = 1 + Math.log1p(Math.max(0, playtimeMinutes));
  return playtimeWeight * ratingFactor;
}
