import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../../middleware';
import type { JournalController } from './journal.controller';
import {
  closeTradeSchema,
  createTradeSchema,
  listTradesQuerySchema,
  reviewTradeSchema,
  statsQuerySchema,
  tradeIdParamSchema,
} from './journal.schemas';

export function journalRoutes(container: AppContainer, controller: JournalController): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  const canRead = authorize('journal:read');
  const canManage = authorize('journal:manage');

  router.use(authenticate(tokenService));

  router.get('/stats', canRead, validate({ query: statsQuerySchema }), asyncHandler(controller.stats));
  router.get('/', canRead, validate({ query: listTradesQuerySchema }), asyncHandler(controller.list));
  router.post('/', canManage, validate({ body: createTradeSchema }), asyncHandler(controller.create));
  router.get('/:id', canRead, validate({ params: tradeIdParamSchema }), asyncHandler(controller.get));
  router.post(
    '/:id/close',
    canManage,
    validate({ params: tradeIdParamSchema, body: closeTradeSchema }),
    asyncHandler(controller.close),
  );
  router.patch(
    '/:id/review',
    canManage,
    validate({ params: tradeIdParamSchema, body: reviewTradeSchema }),
    asyncHandler(controller.review),
  );
  router.delete('/:id', canManage, validate({ params: tradeIdParamSchema }), asyncHandler(controller.remove));

  return router;
}
