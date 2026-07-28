import { UpstreamError } from '../../shared/errors';
import type { Logger } from '../../shared/infrastructure/logger';
import type {
  IMarketDataProvider,
  ProviderCapabilities,
  SymbolRef,
} from '../abstractions';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Convenience base class for HTTP-backed providers. Concrete providers extend
 * this, set their `id`/`priority`/`capabilities`, and implement the data
 * methods using the protected `http` helper (timeouts + typed error mapping).
 */
export abstract class BaseHttpProvider implements IMarketDataProvider {
  abstract readonly id: string;
  abstract readonly priority: number;
  abstract readonly capabilities: ProviderCapabilities;

  protected constructor(
    protected readonly baseUrl: string,
    protected readonly logger: Logger,
  ) {}

  supports(symbol: SymbolRef): boolean {
    return this.capabilities.assetClasses.includes(symbol.assetClass);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  protected async http<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, query, body, timeoutMs = 8000 } = options;
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { accept: 'application/json', ...headers },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new UpstreamError(`${this.id} responded ${res.status}`, {
          details: { status: res.status, url: url.pathname },
        });
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      throw new UpstreamError(`${this.id} request failed`, { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }

  // Data methods are provider-specific; concrete adapters implement them.
  abstract getQuote(symbol: SymbolRef): ReturnType<IMarketDataProvider['getQuote']>;
  abstract getQuotes(symbols: SymbolRef[]): ReturnType<IMarketDataProvider['getQuotes']>;
  abstract getCandles(
    request: Parameters<IMarketDataProvider['getCandles']>[0],
  ): ReturnType<IMarketDataProvider['getCandles']>;
}
