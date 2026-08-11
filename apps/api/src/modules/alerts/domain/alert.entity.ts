import { AggregateRoot, Result, UniqueEntityID } from '../../../shared/domain';
import type { AlertCondition } from './alert-condition';

export type AlertStatus = 'ACTIVE' | 'PAUSED' | 'TRIGGERED' | 'EXPIRED' | 'DISABLED';

export interface AlertProps {
  userId: string;
  instrumentId: string;
  name: string;
  type: 'PRICE';
  condition: AlertCondition;
  status: AlertStatus;
  channels: string[];
  cooldownSec: number;
  isRepeating: boolean;
  triggerCount: number;
  lastTriggeredAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlertInput {
  userId: string;
  instrumentId: string;
  name: string;
  condition: AlertCondition;
  channels?: string[];
  cooldownSec?: number;
  isRepeating?: boolean;
  expiresAt?: Date | null;
}

export class Alert extends AggregateRoot<AlertProps> {
  private constructor(props: AlertProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }
  get status(): AlertStatus {
    return this.props.status;
  }
  get condition(): AlertCondition {
    return this.props.condition;
  }

  static create(input: CreateAlertInput): Result<Alert, string> {
    const name = input.name?.trim();
    if (!name) return Result.fail('Alert name is required');
    if (input.condition.kind !== 'PRICE' || !Number.isFinite(input.condition.value)) {
      return Result.fail('A valid price condition is required');
    }
    const now = new Date();
    return Result.ok(
      new Alert({
        userId: input.userId,
        instrumentId: input.instrumentId,
        name,
        type: 'PRICE',
        condition: input.condition,
        status: 'ACTIVE',
        channels: input.channels ?? ['IN_APP'],
        cooldownSec: input.cooldownSec ?? 0,
        isRepeating: input.isRepeating ?? false,
        triggerCount: 0,
        lastTriggeredAt: null,
        expiresAt: input.expiresAt ?? null,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  static reconstitute(props: AlertProps, id: UniqueEntityID): Alert {
    return new Alert(props, id);
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  pause(): void {
    if (this.props.status === 'ACTIVE') this.props.status = 'PAUSED';
    this.props.updatedAt = new Date();
  }

  resume(): void {
    if (this.props.status === 'PAUSED' || this.props.status === 'TRIGGERED') {
      this.props.status = 'ACTIVE';
    }
    this.props.updatedAt = new Date();
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt !== null && this.props.expiresAt <= now;
  }

  isInCooldown(now: Date = new Date()): boolean {
    if (this.props.cooldownSec <= 0 || this.props.lastTriggeredAt === null) return false;
    return now.getTime() - this.props.lastTriggeredAt.getTime() < this.props.cooldownSec * 1000;
  }

  canTrigger(now: Date = new Date()): boolean {
    return this.props.status === 'ACTIVE' && !this.isExpired(now) && !this.isInCooldown(now);
  }

  /** Records a firing; a non-repeating alert becomes TRIGGERED (inactive). */
  recordTrigger(now: Date = new Date()): void {
    this.props.triggerCount += 1;
    this.props.lastTriggeredAt = now;
    if (!this.props.isRepeating) {
      this.props.status = 'TRIGGERED';
    }
    this.props.updatedAt = now;
  }

  toPersistenceProps(): Readonly<AlertProps> {
    return this.props;
  }
}
