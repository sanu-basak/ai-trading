import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, validate } from '../../../middleware';
import type { InstrumentsController } from './instruments.controller';
import { instrumentIdParamSchema, searchInstrumentsSchema } from './instruments.schemas';

export function instrumentsRoutes(
  container: AppContainer,
  controller: InstrumentsController,
): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  const requireAuth = authenticate(tokenService);

  router.get('/exchanges', requireAuth, asyncHandler(controller.listExchanges));
  router.get(
    '/',
    requireAuth,
    validate({ query: searchInstrumentsSchema }),
    asyncHandler(controller.search),
  );
  router.get(
    '/:id',
    requireAuth,
    validate({ params: instrumentIdParamSchema }),
    asyncHandler(controller.getById),
  );

  return router;
}
