import { z } from 'zod';
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, authorize, validate } from '../../middleware';
import { NotFoundError } from '../../shared/errors';
import { sendCreated, sendNoContent, sendOk } from '../../http/response';
import { PrismaStrategyRepository } from './infrastructure/prisma-strategy.repository';

const idParam = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
  type: z.enum(['RULE_BASED', 'AI', 'HYBRID', 'MANUAL']).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']).optional(),
    definition: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });

export function registerStrategyModule(container: AppContainer): Router {
  const { prisma, tokenService } = container.cradle;
  const repo = new PrismaStrategyRepository(prisma.client as unknown as PrismaClient);
  const router = Router();
  router.use(authenticate(tokenService));
  const canRead = authorize('strategy:read');
  const canManage = authorize('strategy:manage');

  router.get(
    '/',
    canRead,
    asyncHandler(async (req, res) => sendOk(res, await repo.listByUser(req.user!.id))),
  );
  router.post(
    '/',
    canManage,
    validate({ body: createSchema }),
    asyncHandler(async (req, res) => sendCreated(res, await repo.create(req.user!.id, req.body))),
  );
  router.get(
    '/:id',
    canRead,
    validate({ params: idParam }),
    asyncHandler(async (req, res) => {
      const s = await repo.findById(req.params.id!, req.user!.id);
      if (!s) throw new NotFoundError('Strategy');
      sendOk(res, s);
    }),
  );
  router.patch(
    '/:id',
    canManage,
    validate({ params: idParam, body: updateSchema }),
    asyncHandler(async (req, res) => {
      const s = await repo.update(req.params.id!, req.user!.id, req.body);
      if (!s) throw new NotFoundError('Strategy');
      sendOk(res, s);
    }),
  );
  router.delete(
    '/:id',
    canManage,
    validate({ params: idParam }),
    asyncHandler(async (req, res) => {
      const ok = await repo.delete(req.params.id!, req.user!.id);
      if (!ok) throw new NotFoundError('Strategy');
      sendNoContent(res);
    }),
  );

  return router;
}
