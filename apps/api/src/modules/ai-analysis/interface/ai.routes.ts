import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../../middleware';
import type { AiAnalysisController } from './ai.controller';
import { analyzeSchema, listSignalsQuerySchema, signalIdParamSchema } from './ai.schemas';

export function aiAnalysisRoutes(
  container: AppContainer,
  controller: AiAnalysisController,
): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  router.use(authenticate(tokenService));

  router.post(
    '/analyze',
    authorize('signal:create'),
    validate({ body: analyzeSchema }),
    asyncHandler(controller.analyze),
  );
  router.get(
    '/signals',
    authorize('signal:read'),
    validate({ query: listSignalsQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    '/signals/:id',
    authorize('signal:read'),
    validate({ params: signalIdParamSchema }),
    asyncHandler(controller.get),
  );

  return router;
}
