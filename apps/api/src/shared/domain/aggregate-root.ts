import { Entity } from './entity';
import { DomainEvent } from './domain-event';
import { UniqueEntityID } from './identifier';

/**
 * Base class for aggregate roots. Aggregates collect domain events while their
 * invariants are mutated; the persistence layer pulls and publishes them after
 * the surrounding transaction commits (never before).
 */
export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  get aggregateId(): UniqueEntityID {
    return this._id;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  /** Returns and clears buffered events — called by the unit of work post-commit. */
  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  clearEvents(): void {
    this._domainEvents = [];
  }
}
