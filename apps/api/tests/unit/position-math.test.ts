import { describe, it, expect } from 'vitest';
import { applyToHolding } from '../../src/modules/portfolio/domain/position-math';

describe('portfolio position math', () => {
  it('averages cost across buys (fees fold into basis)', () => {
    let h = applyToHolding(null, { type: 'BUY', quantity: 10, price: 100, fees: 0 }).next;
    h = applyToHolding(h, { type: 'BUY', quantity: 10, price: 120, fees: 0 }).next;
    expect(h.quantity).toBe(20);
    expect(h.avgCost).toBeCloseTo(110, 9);
  });

  it('realizes P&L on a sell', () => {
    const h = applyToHolding(null, { type: 'BUY', quantity: 20, price: 110, fees: 0 }).next;
    const r = applyToHolding(h, { type: 'SELL', quantity: 5, price: 130, fees: 0 });
    expect(r.next.quantity).toBe(15);
    expect(r.next.realizedPnl).toBeCloseTo(100, 9);
  });

  it('rejects selling more than held', () => {
    const h = applyToHolding(null, { type: 'BUY', quantity: 5, price: 100, fees: 0 }).next;
    const r = applyToHolding(h, { type: 'SELL', quantity: 10, price: 120, fees: 0 });
    expect(r.error).toBeTruthy();
  });

  it('treats a dividend as income', () => {
    const h = applyToHolding(null, { type: 'BUY', quantity: 10, price: 100, fees: 0 }).next;
    const r = applyToHolding(h, { type: 'DIVIDEND', quantity: 0, price: 0, fees: 0, amount: 50 });
    expect(r.next.realizedPnl).toBe(50);
    expect(r.next.quantity).toBe(10);
    expect(r.cashImpact).toBe(50);
  });

  it('negative cash impact on a buy', () => {
    const r = applyToHolding(null, { type: 'BUY', quantity: 10, price: 100, fees: 5 });
    expect(r.cashImpact).toBe(-1005);
  });
});
