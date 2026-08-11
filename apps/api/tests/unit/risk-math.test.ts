import { describe, it, expect } from 'vitest';
import { computePositionSize, computeRiskReward } from '../../src/modules/risk/domain/risk-math';

describe('position sizing', () => {
  it('risks exactly the specified fraction of the account', () => {
    // 100k account, 1% risk = 1000 risk. Stop 10 away -> 100 units, value 10,000.
    const r = computePositionSize({ accountSize: 100_000, riskPct: 1, entry: 100, stop: 90, side: 'LONG' });
    expect(r.valid).toBe(true);
    expect(r.riskAmount).toBe(1000);
    expect(r.stopDistance).toBe(10);
    expect(r.quantity).toBe(100);
    expect(r.positionValue).toBe(10_000);
    expect(r.positionPctOfAccount).toBe(10);
  });

  it('computes R:R when a target is given', () => {
    const r = computePositionSize({ accountSize: 100_000, riskPct: 1, entry: 100, stop: 90, side: 'LONG', target: 130 });
    expect(r.riskReward).toBeCloseTo(3, 9); // reward 30 / risk 10
  });

  it('flags a long stop placed above entry', () => {
    const r = computePositionSize({ accountSize: 100_000, riskPct: 1, entry: 100, stop: 110, side: 'LONG' });
    expect(r.valid).toBe(false);
    expect(r.warning).toBeTruthy();
    expect(r.quantity).toBe(0);
  });

  it('handles short position risk-reward', () => {
    expect(computeRiskReward({ entry: 100, stop: 110, target: 70, side: 'SHORT' })).toBeCloseTo(3, 9);
  });
});
