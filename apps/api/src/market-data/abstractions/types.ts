/**
 * Provider-agnostic market-data contracts. These are the ONLY shapes the rest
 * of the platform consumes — concrete providers map their payloads into these.
 *
 * Integrity rule: every value returned here originates from a real upstream
 * provider. The platform never synthesizes or guesses prices.
 */

export type AssetClass =
  | 'EQUITY'
  | 'INDEX'
  | 'ETF'
  | 'CRYPTO'
  | 'FOREX'
  | 'COMMODITY'
  | 'OPTION'
  | 'FUTURE'
  | 'BOND';

export type Timeframe =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d'
  | '1w'
  | '1M';

/** A normalized symbol reference understood by a provider. */
export interface SymbolRef {
  symbol: string;
  exchange: string;
  assetClass: AssetClass;
}

/** A real-time (or last-traded) quote. */
export interface Quote {
  symbol: string;
  exchange: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  bid?: number;
  ask?: number;
  timestamp: number; // epoch ms
  source: string; // originating provider id
}

/** A single OHLCV candle. */
export interface OHLCV {
  openTime: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
}

export interface CandleRequest {
  symbol: SymbolRef;
  timeframe: Timeframe;
  from: number; // epoch ms
  to: number; // epoch ms
  limit?: number;
}

export interface CandleResponse {
  symbol: string;
  exchange: string;
  timeframe: Timeframe;
  candles: OHLCV[];
  source: string;
}

/** One strike row of an option chain. */
export interface OptionChainRow {
  strike: number;
  call?: OptionQuote;
  put?: OptionQuote;
}

export interface OptionQuote {
  oi?: number;
  changeInOi?: number;
  volume?: number;
  iv?: number;
  ltp?: number;
  bid?: number;
  ask?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionChain {
  underlying: string;
  exchange: string;
  expiry: number; // epoch ms
  spot: number;
  rows: OptionChainRow[];
  source: string;
  timestamp: number;
}
