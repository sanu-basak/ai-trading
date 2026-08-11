import { z } from 'zod';
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, validate } from '../../middleware';
import { NotFoundError, ServiceUnavailableError } from '../../shared/errors';
import { sendNoContent, sendOk } from '../../http/response';

const SUPPORTED_BROKERS = [
  'ZERODHA', 'UPSTOX', 'ANGEL_ONE', 'FYERS', 'DHAN',
  'ALPACA', 'INTERACTIVE_BROKERS', 'BINANCE', 'OANDA',
] as const;

/**
 * Broker integration. Listing connections works; initiating a new connection
 * requires the broker's OAuth app credentials — without them it returns a clear
 * "not configured" response. Tokens are encrypted at rest when connections exist.
 */
export function registerBrokerModule(container: AppContainer): Router {
  const { prisma, tokenService } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const router = Router();
  router.use(authenticate(tokenService));

  router.get('/supported', asyncHandler(async (_req, res) => sendOk(res, SUPPORTED_BROKERS)));

  router.get(
    '/connections',
    asyncHandler(async (req, res) => {
      const rows = await db.brokerConnection.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      });
      sendOk(
        res,
        rows.map((c) => ({
          id: c.id,
          broker: c.broker,
          status: c.status,
          label: c.label,
          connectedAt: c.connectedAt ? c.connectedAt.toISOString() : null,
        })),
      );
    }),
  );

  router.post(
    '/connect',
    validate({ body: z.object({ broker: z.enum(SUPPORTED_BROKERS) }) }),
    asyncHandler(async () => {
      throw new ServiceUnavailableError(
        'Broker integration requires the broker app OAuth credentials. Configure them to enable connecting an account.',
      );
    }),
  );

  router.delete(
    '/connections/:id',
    validate({ params: z.object({ id: z.string().min(1) }) }),
    asyncHandler(async (req, res) => {
      const result = await db.brokerConnection.deleteMany({
        where: { id: req.params.id!, userId: req.user!.id },
      });
      if (result.count === 0) throw new NotFoundError('Broker connection');
      sendNoContent(res);
    }),
  );

  return router;
}
