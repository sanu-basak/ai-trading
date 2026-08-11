import { z } from 'zod';
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, validate } from '../../middleware';
import { ServiceUnavailableError } from '../../shared/errors';
import { sendOk } from '../../http/response';

/**
 * Subscription & billing. Plans and the user's current subscription are read
 * from the database (populated by the seed). Checkout requires Razorpay keys —
 * without them it returns a clear, actionable "not configured" response rather
 * than a broken flow.
 */
export function registerBillingModule(container: AppContainer): Router {
  const { prisma, config, tokenService } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const router = Router();
  router.use(authenticate(tokenService));

  router.get(
    '/plans',
    asyncHandler(async (_req, res) => {
      const plans = await db.plan.findMany({
        where: { isActive: true, isPublic: true },
        orderBy: { sortOrder: 'asc' },
      });
      sendOk(
        res,
        plans.map((p) => ({
          id: p.id,
          tier: p.tier,
          name: p.name,
          slug: p.slug,
          description: p.description,
          priceMonthly: Number(p.priceMonthly),
          priceYearly: Number(p.priceYearly),
          currency: p.currency,
          trialDays: p.trialDays,
          features: p.features,
        })),
      );
    }),
  );

  router.get(
    '/subscription',
    asyncHandler(async (req, res) => {
      const sub = await db.subscription.findFirst({
        where: { userId: req.user!.id, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
      sendOk(
        res,
        sub
          ? {
              id: sub.id,
              status: sub.status,
              billingCycle: sub.billingCycle,
              plan: sub.plan.name,
              currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            }
          : null,
      );
    }),
  );

  router.get(
    '/invoices',
    asyncHandler(async (req, res) => {
      const invoices = await db.invoice.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      sendOk(
        res,
        invoices.map((i) => ({
          id: i.id,
          number: i.number,
          status: i.status,
          total: Number(i.total),
          currency: i.currency,
          paidAt: i.paidAt ? i.paidAt.toISOString() : null,
          createdAt: i.createdAt.toISOString(),
        })),
      );
    }),
  );

  router.post(
    '/checkout',
    validate({
      body: z.object({
        planId: z.string().min(1),
        billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
      }),
    }),
    asyncHandler(async () => {
      if (!config.env.RAZORPAY_KEY_ID || !config.env.RAZORPAY_KEY_SECRET) {
        throw new ServiceUnavailableError(
          'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable checkout.',
        );
      }
      // With keys present, a Razorpay order/subscription would be created here.
      throw new ServiceUnavailableError('Payment provider integration is pending activation.');
    }),
  );

  return router;
}
