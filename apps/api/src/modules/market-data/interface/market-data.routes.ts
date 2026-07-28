import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, validate } from '../../../middleware';
import type { MarketDataController } from './market-data.controller';
import {
  candlesQuerySchema,
  optionChainQuerySchema,
  quoteQuerySchema,
} from './market-data.schemas';

export function marketDataRoutes(
  container: AppContainer,
  controller: MarketDataController,
): Router {
  const { tokenService } = container.cradle;
  const router = Router();
  const requireAuth = authenticate(tokenService);

  router.get('/quote', requireAuth, validate({ query: quoteQuerySchema }), asyncHandler(controller.getQuote));
  router.get('/candles', requireAuth, validate({ query: candlesQuerySchema }), asyncHandler(controller.getCandles));
  router.get(
    '/option-chain',
    requireAuth,
    validate({ query: optionChainQuerySchema }),
    asyncHandler(controller.getOptionChain),
  );

  return router;
}
