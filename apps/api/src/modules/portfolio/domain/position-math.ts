/**
 * Pure position mathematics for a long-only holdings tracker. Fees on a BUY are
 * folded into cost basis; a SELL realizes P&L against the average cost.
 * Deterministic and side-effect free so it is trivially unit-testable.
 */

export interface HoldingState {
  quantity: number;
  avgCost: number;
  realizedPnl: number;
}

export type PortfolioTxType = 'BUY' | 'SELL' | 'DIVIDEND';

export interface TradeInput {
  type: PortfolioTxType;
  quantity: number;
  price: number;
  fees: number;
  /** Cash amount for income transactions (DIVIDEND). */
  amount?: number;
}

export interface ApplyResult {
  next: HoldingState;
  /** Signed cash impact of the transaction (negative = outflow). */
  cashImpact: number;
  error?: string;
}

const EPSILON = 1e-9;

export function applyToHolding(current: HoldingState | null, tx: TradeInput): ApplyResult {
  const quantity = current?.quantity ?? 0;
  const avgCost = current?.avgCost ?? 0;
  const realizedPnl = current?.realizedPnl ?? 0;

  if (tx.type === 'BUY') {
    const newQty = quantity + tx.quantity;
    const newAvg = newQty > EPSILON ? (quantity * avgCost + tx.quantity * tx.price + tx.fees) / newQty : 0;
    return {
      next: { quantity: newQty, avgCost: newAvg, realizedPnl },
      cashImpact: -(tx.quantity * tx.price + tx.fees),
    };
  }

  if (tx.type === 'SELL') {
    if (tx.quantity > quantity + EPSILON) {
      return {
        next: { quantity, avgCost, realizedPnl },
        cashImpact: 0,
        error: 'Cannot sell more than the quantity currently held',
      };
    }
    const realizedDelta = (tx.price - avgCost) * tx.quantity - tx.fees;
    const newQty = quantity - tx.quantity;
    return {
      next: {
        quantity: newQty,
        avgCost: newQty > EPSILON ? avgCost : 0,
        realizedPnl: realizedPnl + realizedDelta,
      },
      cashImpact: tx.quantity * tx.price - tx.fees,
    };
  }

  // DIVIDEND (income)
  const income = tx.amount ?? 0;
  return {
    next: { quantity, avgCost, realizedPnl: realizedPnl + income },
    cashImpact: income,
  };
}
