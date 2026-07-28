import type { Logger } from '../../shared/infrastructure/logger';
import { BaseHttpProvider } from './base-provider';
import type {
  CandleRequest,
  CandleResponse,
  OHLCV,
  ProviderCapabilities,
  Quote,
  SymbolRef,
  Timeframe,
} from '../abstractions';

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  prevClosePrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  bidPrice: string;
  askPrice: string;
  closeTime: number;
}

// Binance kline row: [openTime, open, high, low, close, volume, closeTime, ...]
type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];

// The platform's Timeframe strings map 1:1 to Binance intervals (except none needed).
const INTERVALS: Record<Timeframe, string> = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
};

/**
 * Live crypto market data from Binance's public REST API (no API key required).
 * Returns only real, upstream-sourced prices — no synthesis. This is the
 * reference implementation of {@link BaseHttpProvider}; keyed providers
 * (Zerodha, Polygon, OANDA, …) follow the same shape with credentials injected.
 */
export class BinanceProvider extends BaseHttpProvider {
  readonly id = 'binance';
  readonly priority = 10;
  readonly capabilities: ProviderCapabilities = {
    quotes: true,
    candles: true,
    optionChain: false,
    streaming: false,
    assetClasses: ['CRYPTO'],
  };

  constructor(logger: Logger, baseUrl = 'https://api.binance.com') {
    super(baseUrl, logger);
  }

  override async healthCheck(): Promise<boolean> {
    try {
      await this.http('/api/v3/ping');
      return true;
    } catch {
      return false;
    }
  }

  async getQuote(symbol: SymbolRef): Promise<Quote> {
    const t = await this.http<BinanceTicker>('/api/v3/ticker/24hr', {
      query: { symbol: symbol.symbol.toUpperCase() },
    });
    return this.mapTicker(symbol, t);
  }

  async getQuotes(symbols: SymbolRef[]): Promise<Quote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }

  async getCandles(request: CandleRequest): Promise<CandleResponse> {
    const interval = INTERVALS[request.timeframe];
    const rows = await this.http<BinanceKline[]>('/api/v3/klines', {
      query: {
        symbol: request.symbol.symbol.toUpperCase(),
        interval,
        startTime: request.from,
        endTime: request.to,
        limit: request.limit ?? 500,
      },
    });

    const candles: OHLCV[] = rows.map((k) => ({
      openTime: k[0],
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));

    return {
      symbol: request.symbol.symbol.toUpperCase(),
      exchange: request.symbol.exchange,
      timeframe: request.timeframe,
      candles,
      source: this.id,
    };
  }

  private mapTicker(symbol: SymbolRef, t: BinanceTicker): Quote {
    return {
      symbol: symbol.symbol.toUpperCase(),
      exchange: symbol.exchange,
      price: Number(t.lastPrice),
      open: Number(t.openPrice),
      high: Number(t.highPrice),
      low: Number(t.lowPrice),
      close: Number(t.lastPrice),
      previousClose: Number(t.prevClosePrice),
      change: Number(t.priceChange),
      changePercent: Number(t.priceChangePercent),
      volume: Number(t.volume),
      bid: Number(t.bidPrice),
      ask: Number(t.askPrice),
      timestamp: t.closeTime,
      source: this.id,
    };
  }
}
