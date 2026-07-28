import type { Logger } from '../../infrastructure/logger';
import type { DomainEvent } from '../../domain/domain-event';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

/** Contract for publishing and subscribing to domain/integration events. */
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}

/**
 * In-process event bus. Handlers are invoked sequentially; a failing handler is
 * logged and isolated so one subscriber cannot break the others. For
 * cross-instance fan-out, an adapter can bridge this to Redis pub/sub.
 */
export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(private readonly logger: Logger) {}

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    const name = event.eventName();
    const handlers = this.handlers.get(name) ?? [];
    this.logger.debug({ event: name, handlers: handlers.length }, 'Publishing domain event');
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error({ err, event: name }, 'Event handler failed');
      }
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
