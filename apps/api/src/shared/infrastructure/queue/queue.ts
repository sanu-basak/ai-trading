import { Queue, Worker, QueueEvents, type JobsOptions, type Processor, type WorkerOptions } from 'bullmq';
import type { AppConfig } from '../config';
import type { Logger } from '../logger';

/** Canonical BullMQ queue names used across the platform. */
export const QUEUE_NAMES = {
  MARKET_DATA: 'market-data',
  AI_ANALYSIS: 'ai-analysis',
  BACKTEST: 'backtest',
  SCANNER: 'scanner',
  NEWS: 'news',
  NOTIFICATIONS: 'notifications',
  ALERTS: 'alerts',
  BILLING: 'billing',
  EMAIL: 'email',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Central factory for BullMQ queues and workers. All share the same Redis
 * connection options (BullMQ requires `maxRetriesPerRequest: null` on worker
 * connections). Instances are cached and closed together on shutdown.
 */
export class QueueService {
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private readonly queueEvents = new Map<string, QueueEvents>();

  private readonly connection: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db: number;
    maxRetriesPerRequest: null;
  };

  private readonly defaultJobOptions: JobsOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  };

  constructor(
    config: AppConfig,
    private readonly logger: Logger,
  ) {
    this.connection = {
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: null,
    };
  }

  getQueue(name: QueueName): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: this.defaultJobOptions,
      });
      this.queues.set(name, queue);
      this.logger.debug({ queue: name }, 'Queue created');
    }
    return queue;
  }

  async enqueue<T>(name: QueueName, jobName: string, data: T, opts?: JobsOptions): Promise<void> {
    await this.getQueue(name).add(jobName, data, opts);
  }

  registerWorker<T>(
    name: QueueName,
    processor: Processor<T>,
    opts?: Partial<WorkerOptions>,
  ): Worker<T> {
    if (this.workers.has(name)) {
      return this.workers.get(name) as Worker<T>;
    }
    const worker = new Worker<T>(name, processor, {
      connection: this.connection,
      concurrency: 5,
      ...opts,
    });
    worker.on('failed', (job, err) =>
      this.logger.error({ queue: name, jobId: job?.id, err }, 'Job failed'),
    );
    worker.on('completed', (job) =>
      this.logger.debug({ queue: name, jobId: job.id }, 'Job completed'),
    );
    this.workers.set(name, worker as unknown as Worker);
    this.logger.info({ queue: name }, 'Worker registered');
    return worker;
  }

  async closeAll(): Promise<void> {
    await Promise.all([
      ...[...this.workers.values()].map((w) => w.close()),
      ...[...this.queues.values()].map((q) => q.close()),
      ...[...this.queueEvents.values()].map((e) => e.close()),
    ]);
    this.logger.info('All queues and workers closed');
  }
}
