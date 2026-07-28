/**
 * Pure fill mathematics for a margin-less paper trading engine supporting both
 * long and short positions. Position quantity is signed (+ long, − short).
 * A fill can increase, reduce, close, or flip a position; realized P&L is booked
 * against the average entry price of the portion closed.
 */

export interface PositionState {
  /** Signed net quantity: positive = long, negative = short, 0 = flat. */
  quantity: number;
  avgEntryPrice: number;
}

export interface FillInput {
  side: 'BUY' | 'SELL';
  quantity: number; // always positive
  price: number;
  fees: number;
}

export interface FillResult {
  position: PositionState;
  /** P&L realized by this fill (on the closed portion). */
  realizedPnl: number;
  /** Signed cash impact (BUY = outflow incl. fees; SELL = inflow less fees). */
  cashDelta: number;
}

const EPS = 1e-9;

export function computeFill(current: PositionState | null, fill: FillInput): FillResult {
  const q = current?.quantity ?? 0;
  const avg = current?.avgEntryPrice ?? 0;
  const dir = fill.side === 'BUY' ? 1 : -1;
  const delta = dir * fill.quantity;
  const cashDelta = (fill.side === 'BUY' ? -1 : 1) * fill.quantity * fill.price - fill.fees;

  let realizedPnl = 0;
  let newQty: number;
  let newAvg: number;

  const sameDirectionOrFlat = q === 0 || Math.sign(q) === Math.sign(delta);

  if (sameDirectionOrFlat) {
    // Opening or increasing the existing position.
    const absQ = Math.abs(q);
    newQty = q + delta;
    newAvg = (absQ * avg + fill.quantity * fill.price) / (absQ + fill.quantity);
  } else {
    // Reducing, closing, or flipping.
    const closingQty = Math.min(fill.quantity, Math.abs(q));
    const perUnit = q > 0 ? fill.price - avg : avg - fill.price; // long vs short
    realizedPnl = perUnit * closingQty;
    newQty = q + delta;

    if (Math.abs(newQty) < EPS) {
      newQty = 0;
      newAvg = 0;
    } else if (Math.sign(newQty) === Math.sign(q)) {
      newAvg = avg; // partial close, same side
    } else {
      newAvg = fill.price; // flipped to the other side at the fill price
    }
  }

  return {
    position: { quantity: newQty, avgEntryPrice: newAvg },
    realizedPnl,
    cashDelta,
  };
}
