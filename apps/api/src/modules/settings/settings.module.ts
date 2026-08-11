import { z } from 'zod';
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, validate } from '../../middleware';
import { sendOk } from '../../http/response';
import { PrismaSettingsRepository } from './infrastructure/prisma-settings.repository';

const updateSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    baseCurrency: z.string().length(3).optional(),
    defaultMarket: z.string().max(20).optional(),
    defaultTimeframe: z.enum(['M1', 'M3', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1']).optional(),
    chartType: z.enum(['candles', 'line', 'area', 'bars']).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });

export function registerSettingsModule(container: AppContainer): Router {
  const { prisma, tokenService } = container.cradle;
  const repo = new PrismaSettingsRepository(prisma.client as unknown as PrismaClient);
  const router = Router();
  router.use(authenticate(tokenService));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      sendOk(res, await repo.get(req.user!.id));
    }),
  );
  router.put(
    '/',
    validate({ body: updateSchema }),
    asyncHandler(async (req, res) => {
      sendOk(res, await repo.upsert(req.user!.id, req.body));
    }),
  );

  return router;
}
