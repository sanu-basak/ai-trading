import type { Logger } from '../logger';
import type { RedisService } from './redis';

/** Abstraction over the cache so call sites don't depend on Redis directly. */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPattern(pattern: string): Promise<number>;
  wrap<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T>;
}

/**
 * JSON cache backed by Redis with a namespaced key prefix and a cache-aside
 * `wrap` helper. Cache failures are swallowed and logged so a cache outage
 * degrades to origin reads rather than failing the request.
 */
export class CacheService implements ICacheService {
  private readonly prefix = 'dq:cache:';

  constructor(
    private readonly redis: RedisService,
    private readonly logger: Logger,
  ) {}

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.client.get(this.k(key));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn({ err, key }, 'Cache get failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.client.set(this.k(key), payload, 'EX', ttlSeconds);
      } else {
        await this.redis.client.set(this.k(key), payload);
      }
    } catch (err) {
      this.logger.warn({ err, key }, 'Cache set failed');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.client.del(this.k(key));
    } catch (err) {
      this.logger.warn({ err, key }, 'Cache delete failed');
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    let removed = 0;
    try {
      const stream = this.redis.client.scanStream({ match: this.k(pattern), count: 200 });
      const pipelineKeys: string[] = [];
      for await (const keys of stream as AsyncIterable<string[]>) {
        pipelineKeys.push(...keys);
      }
      if (pipelineKeys.length > 0) {
        removed = await this.redis.client.del(...pipelineKeys);
      }
    } catch (err) {
      this.logger.warn({ err, pattern }, 'Cache pattern delete failed');
    }
    return removed;
  }

  async wrap<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await producer();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
