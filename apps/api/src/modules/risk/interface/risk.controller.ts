import { z } from 'zod';
import { Router } from 'express';
import type { AppContainer } from '../../../di';
import { asyncHandler, authenticate, validate } from '../../../middleware';
import { sendOk } from '../../../http/response';
import type { PositionSizeResult } from '../domain/risk-math';
import type { RiskProfileView } from '../domain/risk.repository';
import {
  GetRiskProfileQuery,
  PositionSizeQuery,
  UpdateRiskProfileCommand,
} from '../application';

const updateProfileSchema = z.object({
  accountSize: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  maxRiskPerTradePct: z.number().positive().max(100).optional(),
  maxPortfolioRiskPct: z.number().positive().max(100).optional(),
  maxOpenPositions: z.number().int().positive().max(1000).optional(),
  maxDailyLossPct: z.number().positive().max(100).optional(),
  maxDrawdownPct: z.number().positive().max(100).optional(),
  defaultRiskReward: z.number().positive().max(100).optional(),
  positionSizingModel: z.enum(['fixed_fractional', 'fixed_amount', 'kelly', 'volatility']).optional(),
});

const positionSizeSchema = z.object({
  entry: z.number().positive(),
  stop: z.number().positive(),
  side: z.enum(['LONG', 'SHORT']),
  target: z.number().positive().nullable().optional(),
  accountSize: z.number().positive().optional(),
  riskPct: z.number().positive().max(100).optional(),
});

/** Builds the /risk router (profile + position sizing calculator). */
export function riskRoutes(container: AppContainer): Router {
  const { tokenService, commandBus, queryBus } = container.cradle;
  const router = Router();
  router.use(authenticate(tokenService));

  router.get(
    '/profile',
    asyncHandler(async (req, res) => {
      const profile = await queryBus.execute<RiskProfileView>(new GetRiskProfileQuery(req.user!.id));
      sendOk(res, profile);
    }),
  );

  router.put(
    '/profile',
    validate({ body: updateProfileSchema }),
    asyncHandler(async (req, res) => {
      const profile = await commandBus.execute<RiskProfileView>(
        new UpdateRiskProfileCommand(req.user!.id, req.body),
      );
      sendOk(res, profile);
    }),
  );

  router.post(
    '/position-size',
    validate({ body: positionSizeSchema }),
    asyncHandler(async (req, res) => {
      const b = req.body as {
        entry: number;
        stop: number;
        side: 'LONG' | 'SHORT';
        target?: number | null;
        accountSize?: number;
        riskPct?: number;
      };
      const result = await queryBus.execute<PositionSizeResult>(
        new PositionSizeQuery(req.user!.id, b.entry, b.stop, b.side, b.target, b.accountSize, b.riskPct),
      );
      sendOk(res, result);
    }),
  );

  return router;
}
