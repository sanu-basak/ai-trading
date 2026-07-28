import { parseEnv, type Env } from './env';

/** Parsed Redis connection options (BullMQ / ioredis friendly). */
export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls: boolean;
}

function parseRedisUrl(url: string): RedisConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname && parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
    tls: parsed.protocol === 'rediss:',
  };
}

/**
 * Strongly-typed, structured application configuration derived from the
 * validated environment. This is the single object injected everywhere config
 * is needed — no module reads `process.env` directly.
 */
export class AppConfig {
  readonly env: Env;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
  readonly redis: RedisConnectionOptions;
  readonly corsOrigins: string[];

  constructor(env: Env) {
    this.env = env;
    this.isProduction = env.NODE_ENV === 'production';
    this.isDevelopment = env.NODE_ENV === 'development';
    this.isTest = env.NODE_ENV === 'test';
    this.redis = parseRedisUrl(env.REDIS_URL);
    this.corsOrigins = env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  static load(source?: NodeJS.ProcessEnv): AppConfig {
    return new AppConfig(parseEnv(source));
  }
}

export type Config = AppConfig;
