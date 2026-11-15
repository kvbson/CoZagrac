import { describe, expect, it } from 'vitest';
import { getReviewTier, recommendationsThresholds } from '../src/functions/getReviewTier.js';

describe('getReviewTier', () => {
  it('zwraca S dla liczby recenzji >= progu S', () => {
    expect(getReviewTier(recommendationsThresholds.S)).toBe('S');
    expect(getReviewTier(50000)).toBe('S');
  });

  it('zwraca A dla liczby recenzji w przedziale [A, S)', () => {
    expect(getReviewTier(recommendationsThresholds.A)).toBe('A');
    expect(getReviewTier(recommendationsThresholds.S - 1)).toBe('A');
  });

  it('zwraca B dla liczby recenzji w przedziale [B, A)', () => {
    expect(getReviewTier(recommendationsThresholds.B)).toBe('B');
    expect(getReviewTier(recommendationsThresholds.A - 1)).toBe('B');
  });

  it('zwraca undefined poniżej progu B', () => {
    expect(getReviewTier(recommendationsThresholds.B - 1)).toBeUndefined();
    expect(getReviewTier(0)).toBeUndefined();
  });
});
