import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RequestHandler } from 'express';
import type { AppConfig } from '../shared/infrastructure/config';
import type { RedisService } from '../shared/infrastructure/cache';
import { RateLimitError } from '../shared/errors';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  prefix?: string;
  /** Key by user id when authenticated, otherwise by IP. */
  keyByUser?: boolean;
}

/**
 * Builds a Redis-backed rate limiter so limits are enforced consistently across
 * all API instances. Exceeding the limit yields a typed {@link RateLimitError}.
 */
export function createRateLimiter(
  redis: RedisService,
  config: AppConfig,
  options: RateLimitOptions = {},
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs ?? config.env.RATE_LIMIT_WINDOW_MS,
    max: options.max ?? config.env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: options.prefix ?? 'dq:rl:http:',
      // ioredis exposes `call`; rate-limit-redis passes raw command args.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: (...args: string[]): Promise<any> =>
        (redis.client as unknown as { call: (...a: string[]) => Promise<any> }).call(...args),
    }),
    keyGenerator: (req): string => {
      if (options.keyByUser && req.user) return `u:${req.user.id}`;
      return req.ip ?? 'unknown';
    },
    handler: (_req, _res, next) => {
      next(new RateLimitError());
    },
  });
}

/** A stricter limiter suitable for auth endpoints (login, register, reset). */
export function createAuthRateLimiter(redis: RedisService, config: AppConfig): RequestHandler {
  return createRateLimiter(redis, config, {
    windowMs: 15 * 60 * 1000,
    max: 20,
    prefix: 'dq:rl:auth:',
  });
}
