import type { Request, Response } from 'express';
import type { CommandBus, QueryBus } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { sendCreated, sendNoContent, sendOk, sendPage } from '../../../http/response';
import type { AlertOperator } from '../domain/alert-condition';
import type { AlertView } from '../domain/alert.repository';
import type { NotificationView } from '../domain/notification.repository';
import {
  CreateAlertCommand,
  DeleteAlertCommand,
  ListAlertsQuery,
  ListNotificationsQuery,
  MarkAllNotificationsReadCommand,
  MarkNotificationReadCommand,
  SetAlertStatusCommand,
  UnreadCountQuery,
} from '../application';

export class AlertsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // --- Alerts ---
  listAlerts = async (req: Request, res: Response): Promise<void> => {
    const alerts = await this.queryBus.execute<AlertView[]>(new ListAlertsQuery(req.user!.id));
    sendOk(res, alerts);
  };

  createAlert = async (req: Request, res: Response): Promise<void> => {
    const b = req.body as {
      instrumentId: string;
      name: string;
      operator: AlertOperator;
      value: number;
      channels?: string[];
      cooldownSec?: number;
      isRepeating?: boolean;
    };
    const alert = await this.commandBus.execute<AlertView>(
      new CreateAlertCommand(
        req.user!.id,
        b.instrumentId,
        b.name,
        { kind: 'PRICE', operator: b.operator, value: b.value },
        { channels: b.channels, cooldownSec: b.cooldownSec, isRepeating: b.isRepeating },
      ),
    );
    sendCreated(res, alert);
  };

  setAlertStatus = async (req: Request, res: Response): Promise<void> => {
    const { action } = req.body as { action: 'pause' | 'resume' };
    await this.commandBus.execute<void>(
      new SetAlertStatusCommand(req.user!.id, req.params.id!, action),
    );
    sendNoContent(res);
  };

  deleteAlert = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(new DeleteAlertCommand(req.user!.id, req.params.id!));
    sendNoContent(res);
  };

  // --- Notifications ---
  listNotifications = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { page?: number; pageSize?: number; unreadOnly?: boolean };
    const page = await this.queryBus.execute<Page<NotificationView>>(
      new ListNotificationsQuery(
        req.user!.id,
        { page: q.page ?? 1, pageSize: q.pageSize ?? 20 },
        q.unreadOnly ?? false,
      ),
    );
    sendPage(res, page);
  };

  unreadCount = async (req: Request, res: Response): Promise<void> => {
    const result = await this.queryBus.execute<{ count: number }>(
      new UnreadCountQuery(req.user!.id),
    );
    sendOk(res, result);
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(
      new MarkNotificationReadCommand(req.user!.id, req.params.id!),
    );
    sendNoContent(res);
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    const result = await this.commandBus.execute<{ updated: number }>(
      new MarkAllNotificationsReadCommand(req.user!.id),
    );
    sendOk(res, result);
  };
}
