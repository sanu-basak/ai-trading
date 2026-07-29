import { describe, it, expect } from 'vitest';
import { computeFill } from '../../src/modules/paper-trading/domain/fill-math';

describe('paper-trading fill math', () => {
  it('opens a long position at the fill price', () => {
    const r = computeFill(null, { side: 'BUY', quantity: 10, price: 100, fees: 0 });
    expect(r.position.quantity).toBe(10);
    expect(r.position.avgEntryPrice).toBe(100);
    expect(r.realizedPnl).toBe(0);
    expect(r.cashDelta).toBe(-1000);
  });

  it('averages up when adding to a long', () => {
    const first = computeFill(null, { side: 'BUY', quantity: 10, price: 100, fees: 0 }).position;
    const r = computeFill(first, { side: 'BUY', quantity: 10, price: 120, fees: 0 });
    expect(r.position.quantity).toBe(20);
    expect(r.position.avgEntryPrice).toBeCloseTo(110, 9);
  });

  it('realizes P&L on a partial close', () => {
    let pos = computeFill(null, { side: 'BUY', quantity: 20, price: 110, fees: 0 }).position;
    const r = computeFill(pos, { side: 'SELL', quantity: 5, price: 130, fees: 0 });
    expect(r.position.quantity).toBe(15);
    expect(r.realizedPnl).toBeCloseTo((130 - 110) * 5, 9);
    expect(r.position.avgEntryPrice).toBe(110); // unchanged on partial close
  });

  it('flips from long to short and re-bases the average', () => {
    const pos = computeFill(null, { side: 'BUY', quantity: 15, price: 110, fees: 0 }).position;
    const r = computeFill(pos, { side: 'SELL', quantity: 25, price: 130, fees: 0 });
    expect(r.position.quantity).toBe(-10);
    expect(r.position.avgEntryPrice).toBe(130);
    expect(r.realizedPnl).toBeCloseTo((130 - 110) * 15, 9);
  });

  it('realizes P&L when covering a short', () => {
    const short = computeFill(null, { side: 'SELL', quantity: 10, price: 100, fees: 0 }).position;
    expect(short.quantity).toBe(-10);
    const cover = computeFill(short, { side: 'BUY', quantity: 10, price: 90, fees: 0 });
    expect(cover.position.quantity).toBe(0);
    expect(cover.realizedPnl).toBeCloseTo((100 - 90) * 10, 9);
  });

  it('folds fees into cash impact', () => {
    const r = computeFill(null, { side: 'BUY', quantity: 10, price: 100, fees: 5 });
    expect(r.cashDelta).toBe(-1005);
  });
});
