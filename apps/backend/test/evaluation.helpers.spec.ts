import { describe, expect, it } from 'vitest';
import {
  hitRateAtK,
  mean,
  meanNdcgAtK,
  mrr,
  ndcgSingleRelevant,
  percentile,
  recallAtK,
} from '../src/utils/evaluation.helpers.js';

describe('hitRateAtK', () => {
  it('liczy trafienia w top-K, chybienia i braki w wynikach', () => {
    const ranks = [1, 3, null, 15, 4];
    expect(hitRateAtK(ranks, 5)).toBeCloseTo(3 / 5, 9);
    expect(hitRateAtK(ranks, 10)).toBeCloseTo(3 / 5, 9);
    expect(hitRateAtK(ranks, 20)).toBeCloseTo(4 / 5, 9);
  });

  it('pozycja > K to chybienie', () => {
    expect(hitRateAtK([21, 30], 20)).toBe(0);
  });

  it('pusty zbiór = 0', () => {
    expect(hitRateAtK([], 10)).toBe(0);
  });
});

describe('mrr', () => {
  it('srednia 1/rank, brak w wynikach = 0', () => {
    expect(mrr([1, 4, null])).toBeCloseTo((1 + 0.25 + 0) / 3, 9);
  });
});

describe('ndcgSingleRelevant', () => {
  it('pozycja 1 = 1, pozycja poza K = 0', () => {
    expect(ndcgSingleRelevant(1, 10)).toBeCloseTo(1, 9);
    expect(ndcgSingleRelevant(null, 10)).toBe(0);
    expect(ndcgSingleRelevant(11, 10)).toBe(0);
  });

  it('spada logarytmicznie z pozycja', () => {
    expect(ndcgSingleRelevant(2, 10)).toBeCloseTo(1 / Math.log2(3), 9);
    expect(ndcgSingleRelevant(10, 10)).toBeCloseTo(1 / Math.log2(11), 9);
    expect(ndcgSingleRelevant(2, 10)).toBeGreaterThan(ndcgSingleRelevant(10, 10));
  });
});

describe('meanNdcgAtK', () => {
  it('srednia po zapytaniach', () => {
    const ranks = [1, null];
    expect(meanNdcgAtK(ranks, 10)).toBeCloseTo((1 + 0) / 2, 9);
  });
});

describe('percentile', () => {
  it('p50 i p95 z nearest-rank', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(100);
  });

  it('nie mutuje wejścia i radzi sobie z pustką', () => {
    const values = [30, 10, 20];
    expect(percentile(values, 50)).toBe(20);
    expect(values).toEqual([30, 10, 20]);
    expect(percentile([], 95)).toBe(0);
  });
});

describe('recallAtK', () => {
  it('pokrycie przyblizenia wzgledem exact', () => {
    expect(recallAtK([1, 2, 3, 4], [1, 2, 3, 4], 3)).toBe(1);
    expect(recallAtK([9, 2, 3], [1, 2, 3], 3)).toBeCloseTo(2 / 3, 9);
  });
});

describe('mean', () => {
  it('pusta lista = 0', () => {
    expect(mean([])).toBe(0);
    expect(mean([2, 4])).toBe(3);
  });
});
