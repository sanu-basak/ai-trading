import type {
  AssetClass,
  CandleRequest,
  CandleResponse,
  OptionChain,
  Quote,
  SymbolRef,
} from './types';

/** Provider capability flags, so the registry can route requests correctly. */
export interface ProviderCapabilities {
  quotes: boolean;
  candles: boolean;
  optionChain: boolean;
  streaming: boolean;
  assetClasses: AssetClass[];
}

/**
 * The contract every market-data provider implements. Concrete adapters
 * (Zerodha, Binance, Polygon, …) live under `providers/` and are introduced in
 * later steps; the failover service depends only on this interface.
 */
export interface IMarketDataProvider {
  /** Stable provider id, e.g. "binance", "zerodha". */
  readonly id: string;
  /** Lower number = higher preference in failover ordering. */
  readonly priority: number;
  readonly capabilities: ProviderCapabilities;

  /** Whether this provider can serve the given symbol/asset class. */
  supports(symbol: SymbolRef): boolean;

  /** Cheap health probe used by the registry to skip unhealthy providers. */
  healthCheck(): Promise<boolean>;

  getQuote(symbol: SymbolRef): Promise<Quote>;
  getQuotes(symbols: SymbolRef[]): Promise<Quote[]>;
  getCandles(request: CandleRequest): Promise<CandleResponse>;
  getOptionChain?(underlying: SymbolRef, expiry: number): Promise<OptionChain>;
}
