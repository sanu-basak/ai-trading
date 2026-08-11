import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, authorize } from '../../middleware';
import { sendOk } from '../../http/response';

/**
 * Admin surface. User management lives under /users (RBAC-guarded); this adds a
 * platform-overview stats endpoint. Requires the admin:access permission.
 */
export function registerAdminModule(container: AppContainer): Router {
  const { prisma, tokenService } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const router = Router();
  router.use(authenticate(tokenService), authorize('admin:access'));

  router.get(
    '/stats',
    asyncHandler(async (_req, res) => {
      const [
        totalUsers,
        activeUsers,
        newUsers7d,
        signals,
        alerts,
        activeAlerts,
        paperAccounts,
        journalTrades,
        subscriptions,
        buy,
        sell,
        watch,
        noTrade,
      ] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { status: 'ACTIVE' } }),
        db.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
        db.signal.count(),
        db.alert.count(),
        db.alert.count({ where: { status: 'ACTIVE' } }),
        db.paperAccount.count(),
        db.journalTrade.count(),
        db.subscription.count({ where: { status: 'ACTIVE' } }),
        db.signal.count({ where: { type: 'BUY' } }),
        db.signal.count({ where: { type: 'SELL' } }),
        db.signal.count({ where: { type: 'WATCH' } }),
        db.signal.count({ where: { type: 'NO_TRADE' } }),
      ]);

      sendOk(res, {
        users: { total: totalUsers, active: activeUsers, newLast7Days: newUsers7d },
        engagement: { paperAccounts, journalTrades, alerts, activeAlerts },
        ai: { signals, byType: { BUY: buy, SELL: sell, WATCH: watch, NO_TRADE: noTrade } },
        billing: { activeSubscriptions: subscriptions },
        generatedAt: new Date().toISOString(),
      });
    }),
  );

  return router;
}
