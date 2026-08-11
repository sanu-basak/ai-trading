import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../../middleware';
import type { AiAnalysisController } from './ai.controller';
import {
  analyzeMtfSchema,
  analyzeSchema,
  backtestSchema,
  listSignalsQuerySchema,
  signalIdParamSchema,
  smcSchema,
} from './ai.schemas';

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
  router.post(
    '/analyze-mtf',
    authorize('signal:create'),
    validate({ body: analyzeMtfSchema }),
    asyncHandler(controller.analyzeMtf),
  );
  router.post(
    '/smc',
    authorize('signal:create'),
    validate({ body: smcSchema }),
    asyncHandler(controller.smc),
  );
  router.post(
    '/backtest',
    authorize('backtest:run'),
    validate({ body: backtestSchema }),
    asyncHandler(controller.backtest),
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
