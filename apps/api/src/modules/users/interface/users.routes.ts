import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../../middleware';
import type { UsersController } from './users.controller';
import {
  listUsersQuerySchema,
  updateProfileSchema,
  updateStatusSchema,
  userIdParamSchema,
} from './users.schemas';

/** Mounts the users controller. Admin endpoints are RBAC-guarded. */
export function usersRoutes(container: AppContainer, controller: UsersController): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  const requireAuth = authenticate(tokenService);

  // Self-service
  router.patch(
    '/me',
    requireAuth,
    validate({ body: updateProfileSchema }),
    asyncHandler(controller.updateMyProfile),
  );

  // Admin
  router.get(
    '/',
    requireAuth,
    authorize('user:read'),
    validate({ query: listUsersQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    '/:id',
    requireAuth,
    authorize('user:read'),
    validate({ params: userIdParamSchema }),
    asyncHandler(controller.getById),
  );
  router.patch(
    '/:id/status',
    requireAuth,
    authorize('user:manage'),
    validate({ params: userIdParamSchema, body: updateStatusSchema }),
    asyncHandler(controller.updateStatus),
  );

  return router;
}
