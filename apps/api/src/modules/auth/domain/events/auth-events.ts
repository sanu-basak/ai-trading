import { BaseDomainEvent, UniqueEntityID } from '../../../../shared/domain';

/** Raised when a new user completes registration. */
export class UserRegisteredEvent extends BaseDomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    readonly email: string,
  ) {
    super(aggregateId);
  }
  eventName(): string {
    return 'user.registered';
  }
}

/** Raised on a successful authentication. */
export class UserLoggedInEvent extends BaseDomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    readonly ip?: string,
  ) {
    super(aggregateId);
  }
  eventName(): string {
    return 'user.logged_in';
  }
}

/** Raised when a user's email is verified. */
export class EmailVerifiedEvent extends BaseDomainEvent {
  constructor(aggregateId: UniqueEntityID) {
    super(aggregateId);
  }
  eventName(): string {
    return 'user.email_verified';
  }
}

/** Raised when a user's password changes (login, reset, or explicit change). */
export class PasswordChangedEvent extends BaseDomainEvent {
  constructor(aggregateId: UniqueEntityID) {
    super(aggregateId);
  }
  eventName(): string {
    return 'user.password_changed';
  }
}
