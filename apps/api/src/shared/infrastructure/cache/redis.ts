import Redis, { type RedisOptions } from 'ioredis';
import type { AppConfig } from '../config';
import type { Logger } from '../logger';

/**
 * Owns the shared ioredis connection used for caching and pub/sub. BullMQ
 * creates its own connections from the same options (see queue module).
 */
export class RedisService {
  readonly client: Redis;

  constructor(
    config: AppConfig,
    private readonly logger: Logger,
  ) {
    const options: RedisOptions = {
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username,
      password: config.redis.password,
      db: config.redis.db,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      ...(config.redis.tls ? { tls: {} } : {}),
    };
    this.client = new Redis(options);
    this.client.on('error', (err) => this.logger.error({ err }, 'Redis error'));
    this.client.on('connect', () => this.logger.info('Connected to Redis'));
  }

  async connect(): Promise<void> {
    if (this.client.status === 'ready' || this.client.status === 'connecting') return;
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.logger.info('Disconnected from Redis');
  }

  async ping(): Promise<boolean> {
    const pong = await this.client.ping();
    return pong === 'PONG';
  }

  /** Duplicate connection (required for blocking / subscriber clients). */
  duplicate(): Redis {
    return this.client.duplicate();
  }
}
