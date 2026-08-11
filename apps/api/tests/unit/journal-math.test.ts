import { describe, it, expect } from 'vitest';
import { computeClose, computeStats } from '../../src/modules/trade-journal/domain/journal-math';

describe('journal computeClose', () => {
  it('computes long P&L, %, and R-multiple', () => {
    const r = computeClose({ side: 'LONG', quantity: 10, entryPrice: 100, exitPrice: 120, stopLoss: 90, fees: 0 });
    expect(r.pnl).toBe(200); // (120-100)*10
    expect(r.pnlPct).toBeCloseTo(20, 9); // 200 / 1000
    expect(r.rMultiple).toBeCloseTo(2, 9); // risk = |100-90|*10 = 100 -> 200/100
  });

  it('computes short P&L and folds in fees', () => {
    const r = computeClose({ side: 'SHORT', quantity: 5, entryPrice: 100, exitPrice: 90, stopLoss: 105, fees: 10 });
    expect(r.pnl).toBe(40); // (100-90)*5 - 10
    expect(r.rMultiple).toBeCloseTo(40 / (5 * 5), 9); // risk = |100-105|*5 = 25
  });

  it('returns null R-multiple when no stop is set', () => {
    const r = computeClose({ side: 'LONG', quantity: 1, entryPrice: 100, exitPrice: 110 });
    expect(r.rMultiple).toBeNull();
  });
});

describe('journal computeStats', () => {
  it('returns an empty profile for no trades', () => {
    const s = computeStats([]);
    expect(s.totalTrades).toBe(0);
    expect(s.profitFactor).toBeNull();
  });

  it('aggregates win rate, profit factor and expectancy', () => {
    const s = computeStats([
      { pnl: 200, rMultiple: 2 },
      { pnl: -100, rMultiple: -1 },
      { pnl: 300, rMultiple: 3 },
      { pnl: -50, rMultiple: -0.5 },
    ]);
    expect(s.totalTrades).toBe(4);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(2);
    expect(s.winRate).toBe(50);
    expect(s.grossProfit).toBe(500);
    expect(s.grossLoss).toBe(150);
    expect(s.profitFactor).toBeCloseTo(500 / 150, 6);
    expect(s.totalPnl).toBe(350);
    expect(s.expectancy).toBeCloseTo(87.5, 6);
    expect(s.avgRMultiple).toBeCloseTo((2 - 1 + 3 - 0.5) / 4, 6);
    expect(s.largestWin).toBe(300);
    expect(s.largestLoss).toBe(-100);
  });
});
