export type Side = 'LONG' | 'SHORT';

export interface PositionSizeInput {
  accountSize: number;
  riskPct: number; // % of account risked on the trade
  entry: number;
  stop: number;
  side: Side;
  target?: number | null;
}

export interface PositionSizeResult {
  riskAmount: number;
  stopDistance: number;
  stopDistancePct: number;
  quantity: number;
  positionValue: number;
  positionPctOfAccount: number;
  riskReward: number | null;
  valid: boolean;
  warning: string | null;
}

/**
 * Fixed-fractional position sizing: the quantity that risks exactly `riskPct`
 * of the account if the stop is hit. Pure and deterministic.
 *   riskAmount = accountSize × riskPct/100
 *   quantity   = riskAmount / |entry − stop|
 */
export function computePositionSize(input: PositionSizeInput): PositionSizeResult {
  const { accountSize, riskPct, entry, stop, side } = input;
  const stopDistance = Math.abs(entry - stop);
  const riskAmount = accountSize * (riskPct / 100);

  let warning: string | null = null;
  const stopOnWrongSide = side === 'LONG' ? stop >= entry : stop <= entry;
  if (stopOnWrongSide) {
    warning = side === 'LONG' ? 'For a long, the stop must be below entry.' : 'For a short, the stop must be above entry.';
  }

  const valid = accountSize > 0 && entry > 0 && stopDistance > 0 && riskPct > 0 && !stopOnWrongSide;
  const quantity = valid ? riskAmount / stopDistance : 0;
  const positionValue = quantity * entry;

  return {
    riskAmount: round(riskAmount),
    stopDistance: round(stopDistance),
    stopDistancePct: entry > 0 ? round((stopDistance / entry) * 100) : 0,
    quantity: round(quantity, 8),
    positionValue: round(positionValue),
    positionPctOfAccount: accountSize > 0 ? round((positionValue / accountSize) * 100) : 0,
    riskReward: computeRiskReward(input),
    valid,
    warning,
  };
}

export function computeRiskReward(input: {
  entry: number;
  stop: number;
  target?: number | null;
  side: Side;
}): number | null {
  if (input.target == null) return null;
  const risk = Math.abs(input.entry - input.stop);
  const reward = input.side === 'LONG' ? input.target - input.entry : input.entry - input.target;
  if (risk <= 0 || reward <= 0) return null;
  return round(reward / risk, 4);
}

function round(n: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
