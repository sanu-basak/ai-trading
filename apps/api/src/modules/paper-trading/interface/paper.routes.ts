import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, validate } from '../../../middleware';
import type { PaperTradingController } from './paper.controller';
import {
  accountIdParamSchema,
  createAccountSchema,
  listPagedSchema,
  orderParamSchema,
  placeOrderSchema,
} from './paper.schemas';

export function paperTradingRoutes(
  container: AppContainer,
  controller: PaperTradingController,
): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  router.use(authenticate(tokenService));

  router.get('/accounts', asyncHandler(controller.listAccounts));
  router.post('/accounts', validate({ body: createAccountSchema }), asyncHandler(controller.createAccount));
  router.get('/accounts/:id', validate({ params: accountIdParamSchema }), asyncHandler(controller.getAccount));
  router.delete('/accounts/:id', validate({ params: accountIdParamSchema }), asyncHandler(controller.deleteAccount));

  router.post(
    '/accounts/:id/orders',
    validate({ params: accountIdParamSchema, body: placeOrderSchema }),
    asyncHandler(controller.placeOrder),
  );
  router.get(
    '/accounts/:id/orders',
    validate({ params: accountIdParamSchema, query: listPagedSchema }),
    asyncHandler(controller.listOrders),
  );
  router.delete(
    '/accounts/:id/orders/:orderId',
    validate({ params: orderParamSchema }),
    asyncHandler(controller.cancelOrder),
  );
  router.get(
    '/accounts/:id/trades',
    validate({ params: accountIdParamSchema, query: listPagedSchema }),
    asyncHandler(controller.listTrades),
  );

  return router;
}
