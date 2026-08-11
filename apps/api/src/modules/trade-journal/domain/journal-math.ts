export type TradeSide = 'LONG' | 'SHORT';

export interface CloseInput {
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number | null;
  fees?: number;
}

export interface CloseResult {
  pnl: number;
  pnlPct: number;
  /** Realized P&L expressed in units of initial risk (null when no stop set). */
  rMultiple: number | null;
}

/**
 * Computes realized P&L, percentage return, and R-multiple for a closed trade.
 * LONG profits when price rises; SHORT profits when price falls. Fees reduce P&L.
 * R-multiple = P&L / (per-unit risk × quantity), where risk = |entry − stop|.
 */
export function computeClose(input: CloseInput): CloseResult {
  const { side, quantity, entryPrice, exitPrice } = input;
  const fees = input.fees ?? 0;
  const gross =
    side === 'LONG'
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;
  const pnl = gross - fees;
  const cost = Math.abs(entryPrice * quantity);
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

  let rMultiple: number | null = null;
  if (input.stopLoss != null) {
    const riskPerUnit = Math.abs(entryPrice - input.stopLoss);
    const risk = riskPerUnit * quantity;
    if (risk > 0) rMultiple = pnl / risk;
  }

  return { pnl, pnlPct, rMultiple };
}

export interface StatTrade {
  pnl: number;
  rMultiple: number | null;
}

export interface JournalStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number; // %
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  avgWin: number;
  avgLoss: number;
  expectancy: number; // average P&L per trade
  avgRMultiple: number | null;
  largestWin: number;
  largestLoss: number;
}

/** Aggregates performance statistics over a set of closed trades. */
export function computeStats(trades: StatTrade[]): JournalStats {
  const empty: JournalStats = {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    winRate: 0,
    totalPnl: 0,
    grossProfit: 0,
    grossLoss: 0,
    profitFactor: null,
    avgWin: 0,
    avgLoss: 0,
    expectancy: 0,
    avgRMultiple: null,
    largestWin: 0,
    largestLoss: 0,
  };
  if (trades.length === 0) return empty;

  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;
  const rMultiples: number[] = [];

  for (const t of trades) {
    if (t.pnl > 0) {
      wins += 1;
      grossProfit += t.pnl;
      largestWin = Math.max(largestWin, t.pnl);
    } else if (t.pnl < 0) {
      losses += 1;
      grossLoss += Math.abs(t.pnl);
      largestLoss = Math.min(largestLoss, t.pnl);
    } else {
      breakeven += 1;
    }
    if (t.rMultiple != null) rMultiples.push(t.rMultiple);
  }

  const totalTrades = trades.length;
  const totalPnl = grossProfit - grossLoss;
  const round = (n: number): number => Math.round(n * 1e6) / 1e6;

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate: round((wins / totalTrades) * 100),
    totalPnl: round(totalPnl),
    grossProfit: round(grossProfit),
    grossLoss: round(grossLoss),
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss) : grossProfit > 0 ? null : 0,
    avgWin: wins > 0 ? round(grossProfit / wins) : 0,
    avgLoss: losses > 0 ? round(grossLoss / losses) : 0,
    expectancy: round(totalPnl / totalTrades),
    avgRMultiple:
      rMultiples.length > 0
        ? round(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length)
        : null,
    largestWin: round(largestWin),
    largestLoss: round(largestLoss),
  };
}
