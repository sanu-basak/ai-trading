import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../../middleware';
import type { WatchlistController } from './watchlist.controller';
import {
  addItemSchema,
  createWatchlistSchema,
  reorderSchema,
  updateWatchlistSchema,
  watchlistIdParamSchema,
  watchlistItemParamSchema,
} from './watchlist.schemas';

export function watchlistRoutes(container: AppContainer, controller: WatchlistController): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  const requireAuth = authenticate(tokenService);
  const canRead = authorize('watchlist:read');
  const canManage = authorize('watchlist:manage');

  router.use(requireAuth);

  router.get('/', canRead, asyncHandler(controller.list));
  router.post('/', canManage, validate({ body: createWatchlistSchema }), asyncHandler(controller.create));
  router.get('/:id', canRead, validate({ params: watchlistIdParamSchema }), asyncHandler(controller.get));
  router.patch(
    '/:id',
    canManage,
    validate({ params: watchlistIdParamSchema, body: updateWatchlistSchema }),
    asyncHandler(controller.update),
  );
  router.delete('/:id', canManage, validate({ params: watchlistIdParamSchema }), asyncHandler(controller.remove));

  router.post(
    '/:id/items',
    canManage,
    validate({ params: watchlistIdParamSchema, body: addItemSchema }),
    asyncHandler(controller.addItem),
  );
  router.put(
    '/:id/items/order',
    canManage,
    validate({ params: watchlistIdParamSchema, body: reorderSchema }),
    asyncHandler(controller.reorder),
  );
  router.delete(
    '/:id/items/:instrumentId',
    canManage,
    validate({ params: watchlistItemParamSchema }),
    asyncHandler(controller.removeItem),
  );

  return router;
}
