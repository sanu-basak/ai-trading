import type { RedisService } from '../../shared/infrastructure/cache';

/**
 * Distributed token-bucket rate limiter backed by Redis. Used to keep provider
 * request rates within contractual limits across all API instances.
 *
 * Implemented with an atomic Lua script so concurrent callers cannot exceed the
 * bucket capacity due to read-modify-write races.
 */
export class RedisRateLimiter {
  // KEYS[1]=bucket key, ARGV: capacity, refillPerSec, now(ms), requested
  private static readonly LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])
local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then
  tokens = capacity
  ts = now
end
local delta = math.max(0, now - ts) / 1000
tokens = math.min(capacity, tokens + delta * refill)
local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end
redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', key, math.ceil((capacity / refill) * 1000) + 1000)
return { allowed, tokens }
`;

  constructor(private readonly redis: RedisService) {}

  /**
   * Attempts to consume `cost` tokens. Returns true when allowed.
   * @param capacity     max burst
   * @param refillPerSec sustained rate
   */
  async tryConsume(
    bucketKey: string,
    capacity: number,
    refillPerSec: number,
    cost = 1,
  ): Promise<boolean> {
    const now = Date.now();
    const result = (await this.redis.client.eval(
      RedisRateLimiter.LUA,
      1,
      `dq:rl:${bucketKey}`,
      String(capacity),
      String(refillPerSec),
      String(now),
      String(cost),
    )) as [number, number];
    return result[0] === 1;
  }
}
