import type { ICacheService } from '../../shared/infrastructure/cache';
import type { Logger } from '../../shared/infrastructure/logger';
import { MarketDataUnavailableError } from './errors';
import type { ProviderRegistry } from './provider-registry';
import type { RedisRateLimiter } from './rate-limiter';
import type {
  CandleRequest,
  CandleResponse,
  IMarketDataProvider,
  OptionChain,
  Quote,
  SymbolRef,
} from '../abstractions';

interface RateLimitPolicy {
  capacity: number;
  refillPerSec: number;
}

/**
 * The single entry point the rest of the platform uses for market data. It
 * layers three concerns over the raw providers:
 *   1. Caching  — short TTLs per data type (cache-aside).
 *   2. Rate limiting — per-provider distributed token buckets.
 *   3. Failover — tries providers in priority order, skipping unhealthy/limited
 *      ones, and surfaces a typed error only when every candidate fails.
 */
export class MarketDataService {
  private readonly quoteTtl = 3; // seconds
  private readonly candleTtl = 30;
  private readonly optionChainTtl = 15;

  private readonly rateLimits: Record<string, RateLimitPolicy> = {};
  private readonly defaultRateLimit: RateLimitPolicy = { capacity: 60, refillPerSec: 1 };

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly cache: ICacheService,
    private readonly rateLimiter: RedisRateLimiter,
    private readonly logger: Logger,
  ) {}

  setRateLimit(providerId: string, policy: RateLimitPolicy): void {
    this.rateLimits[providerId] = policy;
  }

  async getQuote(symbol: SymbolRef): Promise<Quote> {
    const key = `md:quote:${symbol.exchange}:${symbol.symbol}`;
    return this.cache.wrap(key, this.quoteTtl, () =>
      this.withFailover(symbol, 'quotes', (p) => p.getQuote(symbol)),
    );
  }

  async getCandles(request: CandleRequest): Promise<CandleResponse> {
    const { symbol, timeframe, from, to, limit } = request;
    const key = `md:candles:${symbol.exchange}:${symbol.symbol}:${timeframe}:${from}:${to}:${limit ?? 0}`;
    return this.cache.wrap(key, this.candleTtl, () =>
      this.withFailover(symbol, 'candles', (p) => p.getCandles(request)),
    );
  }

  async getOptionChain(underlying: SymbolRef, expiry: number): Promise<OptionChain> {
    const key = `md:chain:${underlying.exchange}:${underlying.symbol}:${expiry}`;
    return this.cache.wrap(key, this.optionChainTtl, () =>
      this.withFailover(underlying, 'optionChain', (p) => {
        if (!p.getOptionChain) {
          throw new MarketDataUnavailableError(`${p.id} does not provide option chains`);
        }
        return p.getOptionChain(underlying, expiry);
      }),
    );
  }

  /** Runs `op` against candidate providers in order until one succeeds. */
  private async withFailover<T>(
    symbol: SymbolRef,
    capability: 'quotes' | 'candles' | 'optionChain',
    op: (provider: IMarketDataProvider) => Promise<T>,
  ): Promise<T> {
    const candidates = this.registry
      .candidatesFor(symbol)
      .filter((p) => p.capabilities[capability]);

    if (candidates.length === 0) {
      throw new MarketDataUnavailableError(
        `No provider supports ${capability} for ${symbol.exchange}:${symbol.symbol}`,
      );
    }

    const errors: string[] = [];
    for (const provider of candidates) {
      if (!(await this.registry.isHealthy(provider))) {
        errors.push(`${provider.id}: unhealthy`);
        continue;
      }
      const policy = this.rateLimits[provider.id] ?? this.defaultRateLimit;
      const allowed = await this.rateLimiter.tryConsume(
        `md:${provider.id}`,
        policy.capacity,
        policy.refillPerSec,
      );
      if (!allowed) {
        errors.push(`${provider.id}: rate-limited`);
        continue;
      }
      try {
        return await op(provider);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn({ provider: provider.id, symbol, err: message }, 'Provider call failed, failing over');
        this.registry.markUnhealthy(provider.id);
        errors.push(`${provider.id}: ${message}`);
      }
    }

    throw new MarketDataUnavailableError(
      `All providers failed for ${symbol.exchange}:${symbol.symbol} [${errors.join('; ')}]`,
    );
  }
}
