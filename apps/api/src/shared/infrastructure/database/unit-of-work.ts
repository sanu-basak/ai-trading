import type { Prisma } from '@prisma/client';
import type { DomainEvent } from '../../domain/domain-event';
import type { IEventBus } from '../../application/cqrs/event-bus';
import type { PrismaService } from './prisma';

/** The transactional Prisma handle passed to repositories inside a UoW. */
export type TransactionContext = Prisma.TransactionClient;

/**
 * Coordinates an atomic unit of work: runs the callback inside a database
 * transaction and, only after it commits, publishes any domain events collected
 * during the operation. This guarantees "no event before commit".
 */
export class UnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: IEventBus,
  ) {}

  async execute<T>(
    work: (tx: TransactionContext) => Promise<{ result: T; events?: DomainEvent[] }>,
  ): Promise<T> {
    const { result, events } = await this.prisma.client.$transaction(async (tx) => work(tx));
    if (events && events.length > 0) {
      await this.eventBus.publishAll(events);
    }
    return result;
  }

  /** Simple transaction wrapper when no domain events need publishing. */
  async transaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.client.$transaction(async (tx) => work(tx));
  }
}
