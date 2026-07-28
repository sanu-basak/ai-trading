import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../../middleware';
import type { PortfolioController } from './portfolio.controller';
import {
  addTransactionSchema,
  createPortfolioSchema,
  listTransactionsQuerySchema,
  portfolioIdParamSchema,
  updatePortfolioSchema,
} from './portfolio.schemas';

export function portfolioRoutes(container: AppContainer, controller: PortfolioController): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  const canRead = authorize('portfolio:read');
  const canManage = authorize('portfolio:manage');

  router.use(authenticate(tokenService));

  router.get('/', canRead, asyncHandler(controller.list));
  router.post('/', canManage, validate({ body: createPortfolioSchema }), asyncHandler(controller.create));
  router.get('/:id', canRead, validate({ params: portfolioIdParamSchema }), asyncHandler(controller.get));
  router.patch(
    '/:id',
    canManage,
    validate({ params: portfolioIdParamSchema, body: updatePortfolioSchema }),
    asyncHandler(controller.update),
  );
  router.delete('/:id', canManage, validate({ params: portfolioIdParamSchema }), asyncHandler(controller.remove));

  router.post(
    '/:id/transactions',
    canManage,
    validate({ params: portfolioIdParamSchema, body: addTransactionSchema }),
    asyncHandler(controller.addTransaction),
  );
  router.get(
    '/:id/transactions',
    canRead,
    validate({ params: portfolioIdParamSchema, query: listTransactionsQuerySchema }),
    asyncHandler(controller.listTransactions),
  );

  return router;
}
