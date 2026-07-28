import { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../config';
import type { Logger } from '../logger';

/**
 * Wraps the Prisma client with lifecycle management and query logging bridged
 * into the structured logger. A single instance is shared across the process.
 */
export class PrismaService {
  readonly client: PrismaClient<{
    log: [
      { level: 'query'; emit: 'event' },
      { level: 'warn'; emit: 'event' },
      { level: 'error'; emit: 'event' },
    ];
  }>;
  private connected = false;
  private readonly logQueries: boolean;

  constructor(
    config: AppConfig,
    private readonly logger: Logger,
  ) {
    this.logQueries = config.isDevelopment;
    this.client = new PrismaClient({
      datasources: { db: { url: config.env.DATABASE_URL } },
      log: [
        { level: 'query', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    // Bridge Prisma log events into the structured logger.
    this.client.$on('warn', (e) => this.logger.warn({ prisma: e }, 'Prisma warning'));
    this.client.$on('error', (e) => this.logger.error({ prisma: e }, 'Prisma error'));
    this.client.$on('query', (e) => {
      if (this.logQueries) {
        this.logger.debug(
          { query: e.query, params: e.params, durationMs: e.duration },
          'Prisma query',
        );
      }
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.client.$connect();
    this.connected = true;
    this.logger.info('Connected to PostgreSQL');
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.client.$disconnect();
    this.connected = false;
    this.logger.info('Disconnected from PostgreSQL');
  }

  /** Liveness probe used by the health registry. */
  async ping(): Promise<boolean> {
    await this.client.$queryRaw`SELECT 1`;
    return true;
  }
}
