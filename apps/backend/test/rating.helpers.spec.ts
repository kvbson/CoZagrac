import { describe, expect, it } from 'vitest';
import { applyRatingCorrection, profileWeight, ratingStrength } from '../src/utils/rating.helpers.js';

/** cos(a, b) */
const cos = (a: number[], b: number[]) => {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return dot / (norm(a) * norm(b));
};

const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

describe('ratingStrength', () => {
  it('mapuje skale 1-5 na sily: skrajne 1.0, neutralna 0', () => {
    expect(ratingStrength(1)).toBe(1);
    expect(ratingStrength(2)).toBeCloseTo(0.5, 9);
    expect(ratingStrength(3)).toBe(0);
    expect(ratingStrength(4)).toBeCloseTo(0.5, 9);
    expect(ratingStrength(5)).toBe(1);
  });
});

describe('profileWeight', () => {
  it('bez playtime i bez oceny = 1 (zachowanie jak dotychczas)', () => {
    expect(profileWeight(undefined)).toBe(1);
  });

  it('bez playtime: ocena 3 = neutralna, 5 wzmacnia, 1 slabi', () => {
    expect(profileWeight(undefined, 3)).toBe(1);
    expect(profileWeight(undefined, 5)).toBeCloseTo(5 / 3, 9);
    expect(profileWeight(undefined, 1)).toBeCloseTo(1 / 3, 9);
  });

  it('playtime wazy logarytmicznie, zero-playtime wnosi wate 1', () => {
    expect(profileWeight(0)).toBe(1);
    expect(profileWeight(60)).toBeCloseTo(1 + Math.log1p(60), 9);
    expect(profileWeight(6000)).toBeGreaterThan(profileWeight(600));
  });

  it('ujemny playtime jest przycinany do zera', () => {
    expect(profileWeight(-5)).toBe(1);
  });

  it('iloczyn oceny i playtime (wzory z pracy)', () => {
    expect(profileWeight(60, 5)).toBeCloseTo((1 + Math.log1p(60)) * (5 / 3), 9);
    expect(profileWeight(60, 3)).toBeCloseTo(1 + Math.log1p(60), 9);
  });
});

describe('applyRatingCorrection', () => {
  const base = [1, 0];
  const positive = [0, 1];
  const negative = [0, -1];

  it('zwraca kopie base (ta sama wartosc, inny obiekt) gdy brak ocen', () => {
    const out = applyRatingCorrection(base, []);
    expect(out).toEqual(base);
    expect(out).not.toBe(base);
  });

  it('ignoruje ocene neutralna (3) - wynik jak bez ocen', () => {
    expect(applyRatingCorrection(base, [{ vec: positive, rating: 3 }])).toEqual(base);
  });

  it('przesuwa centroid w strone gry ocenionej pozytywnie', () => {
    const out = applyRatingCorrection(base, [{ vec: positive, rating: 5 }]);

    expect(cos(base, positive)).toBe(0);
    expect(cos(out, positive)).toBeGreaterThan(0);
  });

  it('odsuwa centroid od gry ocenionej negatywnie', () => {
    const out = applyRatingCorrection(base, [{ vec: negative, rating: 1 }]);

    // base=[1,0] jest ortogonalna do negative=[0,-1]; odsuniecie = wsp. Y ujemna... nie:
    // korekta -0.5*[0,-1] daje +Y, czyli dokladnie "dalej od" [0,-1]
    expect(cos(out, negative)).toBeLessThan(cos(base, negative));
  });

  it('ocena 5 przyciaga silniej niz 4', () => {
    const out4 = applyRatingCorrection(base, [{ vec: positive, rating: 4 }]);
    const out5 = applyRatingCorrection(base, [{ vec: positive, rating: 5 }]);

    expect(cos(out5, positive)).toBeGreaterThan(cos(out4, positive));
  });

  it('oceny tej samej gry w przeciwnych kierunkach znosza sie', () => {
    const out = applyRatingCorrection(base, [
      { vec: positive, rating: 5 },
      { vec: positive, rating: 1 },
    ]);

    expect(out[0]).toBeCloseTo(1, 9);
    expect(out[1]).toBeCloseTo(0, 9);
  });

  it('normalizuje wynik do normy L2 = 1', () => {
    const out = applyRatingCorrection(base, [{ vec: [3, 4], rating: 5 }]);

    expect(norm(out)).toBeCloseTo(1, 9);
  });

  it('pomija wektory o niezgodnym wymiarze', () => {
    const out = applyRatingCorrection(base, [{ vec: [1, 2, 3], rating: 5 }]);

    expect(out).toEqual(base);
  });

  it('dziala w wielu wymiarach (1536)', () => {
    const big = new Array(1536).fill(0);
    big[0] = 1;
    const game = new Array(1536).fill(0);
    game[1] = 1;

    const out = applyRatingCorrection(big, [{ vec: game, rating: 5 }]);

    expect(out.length).toBe(1536);
    expect(out[1]).toBeGreaterThan(0);
  });
});
