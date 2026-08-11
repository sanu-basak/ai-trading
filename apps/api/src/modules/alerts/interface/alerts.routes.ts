import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../../middleware';
import type { AlertsController } from './alerts.controller';
import {
  alertIdParamSchema,
  createAlertSchema,
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  setStatusSchema,
} from './alerts.schemas';

/** Builds a combined router exposing /alerts and /notifications. */
export function alertsRoutes(container: AppContainer, controller: AlertsController): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  const requireAuth = authenticate(tokenService);

  // --- /alerts ---
  const alerts = Router();
  alerts.use(requireAuth);
  alerts.get('/', authorize('alert:read'), asyncHandler(controller.listAlerts));
  alerts.post('/', authorize('alert:manage'), validate({ body: createAlertSchema }), asyncHandler(controller.createAlert));
  alerts.patch(
    '/:id/status',
    authorize('alert:manage'),
    validate({ params: alertIdParamSchema, body: setStatusSchema }),
    asyncHandler(controller.setAlertStatus),
  );
  alerts.delete(
    '/:id',
    authorize('alert:manage'),
    validate({ params: alertIdParamSchema }),
    asyncHandler(controller.deleteAlert),
  );

  // --- /notifications ---
  const notifications = Router();
  notifications.use(requireAuth);
  notifications.get(
    '/',
    validate({ query: listNotificationsQuerySchema }),
    asyncHandler(controller.listNotifications),
  );
  notifications.get('/unread-count', asyncHandler(controller.unreadCount));
  notifications.post('/read-all', asyncHandler(controller.markAllRead));
  notifications.post(
    '/:id/read',
    validate({ params: notificationIdParamSchema }),
    asyncHandler(controller.markRead),
  );

  router.use('/alerts', alerts);
  router.use('/notifications', notifications);
  return router;
}
