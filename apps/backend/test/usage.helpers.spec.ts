import { describe, expect, it } from 'vitest';
import {
  buildsStatus,
  dayKeyUtc,
  QuotaError,
  tokenBudgetStatus,
} from '../src/utils/usage.helpers.js';

describe('dayKeyUtc', () => {
  it('zwraca klucz dnia YYYY-MM-DD w UTC', () => {
    expect(dayKeyUtc(new Date(Date.UTC(2026, 9, 25, 23, 59, 59)))).toBe('2026-10-25');
  });

  it('przełamanie północy UTC zaczyna nowy dzień (reset limitu)', () => {
    expect(dayKeyUtc(new Date(Date.UTC(2026, 9, 26, 0, 0, 0)))).toBe('2026-10-26');
  });
});

describe('tokenBudgetStatus', () => {
  it('pozwala na wywołanie gdy obie pule mają zapas', () => {
    const status = tokenBudgetStatus({
      usedUser: 100,
      usedGlobal: 1000,
      limitUser: 2_000_000,
      limitGlobal: 10_000_000,
    });

    expect(status.ok).toBe(true);
    expect(status.reason).toBeNull();
    expect(status.userLeft).toBe(2_000_000 - 100);
    expect(status.globalLeft).toBe(10_000_000 - 1000);
  });

  it('blokuje przy wyczerpanej puli globalnej (nawet przy zapasie konta)', () => {
    const status = tokenBudgetStatus({
      usedUser: 0,
      usedGlobal: 10_000_000,
      limitUser: 2_000_000,
      limitGlobal: 10_000_000,
    });

    expect(status.ok).toBe(false);
    expect(status.reason).toBe('global');
  });

  it('blokuje przy wyczerpanej puli konta', () => {
    const status = tokenBudgetStatus({
      usedUser: 2_000_000,
      usedGlobal: 0,
      limitUser: 2_000_000,
      limitGlobal: 10_000_000,
    });

    expect(status.ok).toBe(false);
    expect(status.reason).toBe('user');
  });

  it('pula globalna ma priorytet w komunikacie nad pulą konta', () => {
    const status = tokenBudgetStatus({
      usedUser: 2_000_000,
      usedGlobal: 10_000_000,
      limitUser: 2_000_000,
      limitGlobal: 10_000_000,
    });

    expect(status.reason).toBe('global');
  });

  it('dla batcha (limitUser = Infinity) liczy się tylko pula globalna', () => {
    const status = tokenBudgetStatus({
      usedUser: 0,
      usedGlobal: 9_999_999,
      limitUser: Number.POSITIVE_INFINITY,
      limitGlobal: 10_000_000,
    });

    expect(status.ok).toBe(true);
  });

  it('nigdy nie zwraca ujemnego zapasu', () => {
    const status = tokenBudgetStatus({
      usedUser: 3_000_000,
      usedGlobal: 0,
      limitUser: 2_000_000,
      limitGlobal: 10_000_000,
    });

    expect(status.userLeft).toBe(0);
  });
});

describe('buildsStatus', () => {
  it('pozwala na budowę gdy zostały uruchomienia', () => {
    expect(buildsStatus(3, 4)).toEqual({ ok: true, left: 1 });
  });

  it('blokuje po wykorzystaniu wszystkich buildów', () => {
    expect(buildsStatus(4, 4)).toEqual({ ok: false, left: 0 });
  });

  it('nie zwraca ujemnej liczby pozostałych buildów', () => {
    expect(buildsStatus(9, 4).left).toBe(0);
  });
});

describe('QuotaError', () => {
  it('jest rozpoznawalny po nazwie i typie', () => {
    const error = new QuotaError('limit');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('QuotaError');
    expect(error.message).toBe('limit');
  });
});
