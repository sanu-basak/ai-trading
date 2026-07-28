import { UniqueEntityID } from './identifier';

/**
 * A fact that happened in the domain. Raised by aggregates and published by the
 * persistence layer (unit of work) once the transaction commits.
 */
export interface DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: UniqueEntityID;
  /** Stable, versioned name, e.g. "user.registered". */
  eventName(): string;
}

/** Convenience base for domain events. */
export abstract class BaseDomainEvent implements DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: UniqueEntityID;

  protected constructor(aggregateId: UniqueEntityID, occurredAt?: Date) {
    this.aggregateId = aggregateId;
    this.occurredAt = occurredAt ?? new Date();
  }

  abstract eventName(): string;
}
