import { describe, it, expect } from 'vitest';
import {
  describeCondition,
  evaluateCondition,
  type AlertCondition,
} from '../../src/modules/alerts/domain/alert-condition';

const above: AlertCondition = { kind: 'PRICE', operator: 'ABOVE', value: 100 };
const below: AlertCondition = { kind: 'PRICE', operator: 'BELOW', value: 100 };
const crossUp: AlertCondition = { kind: 'PRICE', operator: 'CROSSES_ABOVE', value: 100 };
const crossDown: AlertCondition = { kind: 'PRICE', operator: 'CROSSES_BELOW', value: 100 };

describe('alert condition evaluation', () => {
  it('ABOVE / BELOW are level checks', () => {
    expect(evaluateCondition(above, { price: 101 })).toBe(true);
    expect(evaluateCondition(above, { price: 99 })).toBe(false);
    expect(evaluateCondition(below, { price: 99 })).toBe(true);
    expect(evaluateCondition(below, { price: 101 })).toBe(false);
  });

  it('CROSSES_ABOVE fires only on the actual crossing', () => {
    expect(evaluateCondition(crossUp, { price: 101, previousPrice: 99 })).toBe(true);
    // Already above on both bars → no fresh cross.
    expect(evaluateCondition(crossUp, { price: 105, previousPrice: 101 })).toBe(false);
    // No previous price → cannot confirm a cross.
    expect(evaluateCondition(crossUp, { price: 101 })).toBe(false);
  });

  it('CROSSES_BELOW fires only on the actual crossing', () => {
    expect(evaluateCondition(crossDown, { price: 99, previousPrice: 101 })).toBe(true);
    expect(evaluateCondition(crossDown, { price: 95, previousPrice: 98 })).toBe(false);
  });

  it('describes conditions in plain language', () => {
    expect(describeCondition(above, 'BTCUSDT')).toBe('BTCUSDT is above 100');
    expect(describeCondition(crossDown, 'RELIANCE')).toBe('RELIANCE crosses below 100');
  });
});
