import { describe, it, expect } from 'vitest';
import { Result } from '../../src/shared/domain/result';
import { parseDurationToSeconds } from '../../src/modules/auth/application/services/duration';
import { normalizePageRequest, buildPage } from '../../src/shared/domain/repository';

describe('Result', () => {
  it('wraps success values', () => {
    const r = Result.ok<number>(42);
    expect(r.isSuccess).toBe(true);
    expect(r.getValue()).toBe(42);
  });

  it('wraps failures and guards getValue', () => {
    const r = Result.fail<number, string>('nope');
    expect(r.isFailure).toBe(true);
    expect(r.getError()).toBe('nope');
    expect(() => r.getValue()).toThrow();
  });
});

describe('parseDurationToSeconds', () => {
  it('parses common durations', () => {
    expect(parseDurationToSeconds('15m', 0)).toBe(900);
    expect(parseDurationToSeconds('1h', 0)).toBe(3600);
    expect(parseDurationToSeconds('30d', 0)).toBe(2_592_000);
    expect(parseDurationToSeconds('45s', 0)).toBe(45);
  });

  it('falls back on malformed input', () => {
    expect(parseDurationToSeconds('nonsense', 123)).toBe(123);
  });
});

describe('pagination', () => {
  it('clamps and defaults page requests', () => {
    expect(normalizePageRequest({ page: 0, pageSize: 9999 })).toMatchObject({ page: 1, pageSize: 100 });
    expect(normalizePageRequest(undefined)).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('computes total pages', () => {
    const page = buildPage([1, 2, 3], 45, { page: 1, pageSize: 20 });
    expect(page.totalPages).toBe(3);
    expect(page.total).toBe(45);
  });
});
