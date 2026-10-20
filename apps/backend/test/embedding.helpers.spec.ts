import { describe, expect, it } from 'vitest';
import {
  chunkReviews,
  l2Normalize,
  meanOrZero,
  toPgVector,
  trimText,
  weightedMean,
} from '../src/utils/embedding.helpers.js';

const approx = (actual: number[], expected: number[]) => {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], 9);
  }
};

describe('trimText', () => {
  it('obcina tekst do maxChars', () => {
    expect(trimText('1234567890', 5)).toBe('12345');
  });

  it('zostawia tekst krótszy niż limit bez zmian', () => {
    expect(trimText('abc', 10)).toBe('abc');
  });
});

describe('weightedMean', () => {
  it('rzuca wyjątek dla pustej listy', () => {
    expect(() => weightedMean([])).toThrowError();
  });

  it('rzuca wyjątek dla wektorów o różnych długościach', () => {
    expect(() =>
      weightedMean([
        { vec: [1, 2], weight: 1 },
        { vec: [1, 2, 3], weight: 1 },
      ]),
    ).toThrowError(/same length/);
  });

  it('dla równych wag zwraca średnią arytmetyczną', () => {
    approx(
      weightedMean([
        { vec: [1, 2], weight: 1 },
        { vec: [3, 4], weight: 1 },
      ]),
      [2, 3],
    );
  });

  it('dla jednej pozycji zwraca jej wektor (waga 1)', () => {
    approx(weightedMean([{ vec: [0.5, -0.25], weight: 2 }]), [0.5, -0.25]);
  });

  it('traktuje sumę wag bezwzględnych jako mianownik (ujemna waga odejmuje)', () => {
    // sum|w| = 3, wynik = (1*[1,0] + 2*[-1,0]) / 3 = [-1/3, 0]
    approx(
      weightedMean([
        { vec: [1, 0], weight: 1 },
        { vec: [-1, 0], weight: 2 },
      ]),
      [-1 / 3, 0],
    );
  });

  it('zwraca wektor zerowy, gdy wszystkie wagi wynoszą 0', () => {
    approx(
      weightedMean([
        { vec: [5, 5], weight: 0 },
        { vec: [7, 7], weight: 0 },
      ]),
      [0, 0],
    );
  });
});

describe('l2Normalize', () => {
  it('normalizuje do normy euklidesowej 1', () => {
    const v = l2Normalize([3, 4]);
    approx(v, [0.6, 0.8]);
    expect(Math.sqrt(v.reduce((a, b) => a + b * b, 0))).toBeCloseTo(1, 9);
  });

  it('wektor zerowy pozostaje zerowy (bez dzielenia przez 0)', () => {
    approx(l2Normalize([0, 0, 0]), [0, 0, 0]);
  });

  it('nie zmienia wektorów już znormalizowanych', () => {
    approx(l2Normalize([1, 0]), [1, 0]);
    approx(l2Normalize([0, 1]), [0, 1]);
  });
});

describe('meanOrZero', () => {
  it('dla pustej listy zwraca wektor zerowy o zadanym wymiarze', () => {
    expect(meanOrZero([], 4)).toEqual([0, 0, 0, 0]);
  });

  it('zwraca średnią po współrzędnych', () => {
    approx(meanOrZero([[1, 3], [3, 1]], 2), [2, 2]);
  });
});

describe('chunkReviews', () => {
  it('dzieli recenzje na porcje i formatuje jako listę punktowaną', () => {
    const chunks = chunkReviews(['a', 'b', 'c'], 2);
    expect(chunks).toEqual(['- a\n- b', '- c']);
  });

  it('domyślnie grupuje po 5', () => {
    const reviews = Array.from({ length: 12 }, (_, i) => `r${i}`);
    const chunks = chunkReviews(reviews);
    expect(chunks.length).toBe(3);
    expect(chunks[0].split('\n').length).toBe(5);
    expect(chunks[2].split('\n').length).toBe(2);
  });

  it('dla pustej listy zwraca pustą tablicę', () => {
    expect(chunkReviews([])).toEqual([]);
  });
});

describe('toPgVector', () => {
  it('serializuje wektor do formatu pgvector', () => {
    expect(toPgVector([1, 2.5, -3])).toBe('[1,2.5,-3]');
  });
});
