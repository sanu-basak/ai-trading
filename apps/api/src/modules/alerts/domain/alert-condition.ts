export type AlertOperator = 'ABOVE' | 'BELOW' | 'CROSSES_ABOVE' | 'CROSSES_BELOW';

/** A price-threshold alert condition (extensible to indicator/pattern later). */
export interface PriceCondition {
  kind: 'PRICE';
  operator: AlertOperator;
  value: number;
}

export type AlertCondition = PriceCondition;

export interface EvalContext {
  price: number;
  previousPrice?: number | null;
}

/**
 * Pure evaluation of an alert condition against a market snapshot.
 * `ABOVE`/`BELOW` are level checks; `CROSSES_*` require the previous price so a
 * trigger fires only on the actual crossing, not while already beyond the level.
 */
export function evaluateCondition(condition: AlertCondition, ctx: EvalContext): boolean {
  if (condition.kind !== 'PRICE') return false;
  const { price, previousPrice } = ctx;
  switch (condition.operator) {
    case 'ABOVE':
      return price > condition.value;
    case 'BELOW':
      return price < condition.value;
    case 'CROSSES_ABOVE':
      return previousPrice != null && previousPrice <= condition.value && price > condition.value;
    case 'CROSSES_BELOW':
      return previousPrice != null && previousPrice >= condition.value && price < condition.value;
    default:
      return false;
  }
}

/** Human-readable description of a condition (for alert names / notifications). */
export function describeCondition(condition: AlertCondition, symbol: string): string {
  const verb = {
    ABOVE: 'is above',
    BELOW: 'is below',
    CROSSES_ABOVE: 'crosses above',
    CROSSES_BELOW: 'crosses below',
  }[condition.operator];
  return `${symbol} ${verb} ${condition.value}`;
}
