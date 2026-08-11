import type { Alert, AlertStatus } from './alert.entity';
import type { AlertCondition } from './alert-condition';

/** A minimal, evaluation-ready view of an active alert joined with instrument. */
export interface EvaluableAlert {
  id: string;
  userId: string;
  instrumentId: string;
  name: string;
  symbol: string;
  exchange: string;
  assetClass: string;
  condition: AlertCondition;
  channels: string[];
  cooldownSec: number;
  isRepeating: boolean;
  lastTriggeredAt: Date | null;
  expiresAt: Date | null;
}

export interface AlertView {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  type: string;
  status: string;
  condition: AlertCondition;
  channels: string[];
  isRepeating: boolean;
  triggerCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface TriggerAlertInput {
  alertId: string;
  userId: string;
  newStatus: AlertStatus;
  lastTriggeredAt: Date;
  payload: Record<string, unknown>;
  notification: {
    title: string;
    body: string;
    data: Record<string, unknown>;
  };
}

export interface IAlertRepository {
  create(alert: Alert): Promise<void>;
  save(alert: Alert): Promise<void>;
  findById(id: string): Promise<Alert | null>;
  listByUser(userId: string): Promise<AlertView[]>;
  delete(id: string): Promise<void>;
  countActiveByUser(userId: string): Promise<number>;

  /** Active, non-expired alerts across all users, for the evaluation worker. */
  listEvaluable(limit: number): Promise<EvaluableAlert[]>;

  /**
   * Atomically records a trigger: writes an AlertTrigger, updates the alert,
   * and creates the in-app notification. Returns the created notification id.
   */
  trigger(input: TriggerAlertInput): Promise<string>;
}
