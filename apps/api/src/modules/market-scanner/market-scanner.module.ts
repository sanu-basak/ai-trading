import { z } from 'zod';
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../middleware';
import { sendOk } from '../../http/response';
import type { Timeframe } from '../../market-data';
import { AiEngineClient } from '../ai-analysis';
import { PrismaWatchlistRepository } from '../watchlist/infrastructure/prisma-watchlist.repository';
import { ScannerService, type ScanResult } from './scanner.service';

const scanSchema = z.object({
  watchlistId: z.string().min(1),
  timeframe: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']).default('1d'),
  signal: z.enum(['BUY', 'SELL', 'NO_TRADE', 'WATCH']).optional(),
});

export function registerMarketScannerModule(container: AppContainer): Router {
  const { prisma, config, logger, marketDataService, tokenService } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const service = new ScannerService(
    new PrismaWatchlistRepository(db),
    marketDataService,
    new AiEngineClient(config.env.AI_ENGINE_URL, logger),
    logger,
  );

  const router = Router();
  router.use(authenticate(tokenService));

  router.post(
    '/watchlist',
    authorize('scanner:run'),
    validate({ body: scanSchema }),
    asyncHandler(async (req, res) => {
      const b = req.body as { watchlistId: string; timeframe: Timeframe; signal?: string };
      const result: ScanResult = await service.scanWatchlist(
        req.user!.id,
        b.watchlistId,
        b.timeframe,
        b.signal,
      );
      sendOk(res, result);
    }),
  );

  return router;
}
