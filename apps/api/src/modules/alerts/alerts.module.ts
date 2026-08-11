import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { createInstrumentRepository } from '../instruments';
import { PrismaAlertRepository, PrismaNotificationRepository } from './infrastructure';
import {
  AlertEvaluationService,
  CreateAlertCommand,
  CreateAlertHandler,
  DeleteAlertCommand,
  DeleteAlertHandler,
  ListAlertsHandler,
  ListAlertsQuery,
  ListNotificationsHandler,
  ListNotificationsQuery,
  MarkAllNotificationsReadCommand,
  MarkAllNotificationsReadHandler,
  MarkNotificationReadCommand,
  MarkNotificationReadHandler,
  SetAlertStatusCommand,
  SetAlertStatusHandler,
  UnreadCountHandler,
  UnreadCountQuery,
} from './application';
import { AlertsController } from './interface/alerts.controller';
import { alertsRoutes } from './interface/alerts.routes';
import { startAlertWorker } from './workers/alert.worker';

export function registerAlertsModule(container: AppContainer): Router {
  const { prisma, commandBus, queryBus } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const alertRepo = new PrismaAlertRepository(db);
  const notificationRepo = new PrismaNotificationRepository(db);
  const instrumentRepo = createInstrumentRepository(container);

  commandBus.register(CreateAlertCommand, new CreateAlertHandler(alertRepo, instrumentRepo));
  commandBus.register(SetAlertStatusCommand, new SetAlertStatusHandler(alertRepo));
  commandBus.register(DeleteAlertCommand, new DeleteAlertHandler(alertRepo));
  commandBus.register(
    MarkNotificationReadCommand,
    new MarkNotificationReadHandler(notificationRepo),
  );
  commandBus.register(
    MarkAllNotificationsReadCommand,
    new MarkAllNotificationsReadHandler(notificationRepo),
  );
  queryBus.register(ListAlertsQuery, new ListAlertsHandler(alertRepo));
  queryBus.register(ListNotificationsQuery, new ListNotificationsHandler(notificationRepo));
  queryBus.register(UnreadCountQuery, new UnreadCountHandler(notificationRepo));

  const controller = new AlertsController(commandBus, queryBus);
  return alertsRoutes(container, controller);
}

/**
 * Starts the alert-evaluation background worker. Called from the server
 * bootstrap after Redis is connected (touches the queue / Redis).
 */
export async function startAlertsWorkers(container: AppContainer): Promise<void> {
  const { prisma, marketDataService, socketServer, logger } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const alertRepo = new PrismaAlertRepository(db);
  const evaluationService = new AlertEvaluationService(
    alertRepo,
    marketDataService,
    socketServer,
    logger,
  );
  await startAlertWorker(container, evaluationService);
}
