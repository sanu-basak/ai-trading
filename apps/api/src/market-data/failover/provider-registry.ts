import type { Logger } from '../../shared/infrastructure/logger';
import type { IMarketDataProvider, SymbolRef } from '../abstractions';

/**
 * Holds the set of registered providers and returns them in failover order
 * (by ascending priority) filtered to those that support a given symbol. A
 * short-lived health cache prevents hammering a provider that just failed.
 */
export class ProviderRegistry {
  private readonly providers: IMarketDataProvider[] = [];
  private readonly healthCache = new Map<string, { healthy: boolean; checkedAt: number }>();
  private readonly healthTtlMs = 15_000;

  constructor(private readonly logger: Logger) {}

  register(provider: IMarketDataProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
    this.logger.info({ provider: provider.id, priority: provider.priority }, 'Market-data provider registered');
  }

  all(): ReadonlyArray<IMarketDataProvider> {
    return this.providers;
  }

  /** Providers that support the symbol, in preference order. */
  candidatesFor(symbol: SymbolRef): IMarketDataProvider[] {
    return this.providers.filter((p) => p.supports(symbol));
  }

  async isHealthy(provider: IMarketDataProvider): Promise<boolean> {
    const cached = this.healthCache.get(provider.id);
    const now = Date.now();
    if (cached && now - cached.checkedAt < this.healthTtlMs) {
      return cached.healthy;
    }
    let healthy = false;
    try {
      healthy = await provider.healthCheck();
    } catch {
      healthy = false;
    }
    this.healthCache.set(provider.id, { healthy, checkedAt: now });
    return healthy;
  }

  markUnhealthy(providerId: string): void {
    this.healthCache.set(providerId, { healthy: false, checkedAt: Date.now() });
  }
}
