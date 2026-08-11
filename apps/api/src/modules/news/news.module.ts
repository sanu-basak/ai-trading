import { z } from 'zod';
import { Router } from 'express';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, validate } from '../../middleware';
import { buildPage, normalizePageRequest } from '../../shared/domain';
import { sendOk, sendPage } from '../../http/response';

/**
 * Market news with AI sentiment. Reads from the database (populated by an
 * ingestion worker when a news provider is configured). Returns cleanly even
 * when empty — no fabricated headlines.
 */
export function registerNewsModule(container: AppContainer): Router {
  const { prisma, tokenService } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const router = Router();
  router.use(authenticate(tokenService));

  router.get(
    '/',
    validate({
      query: z.object({
        page: z.coerce.number().int().positive().optional(),
        pageSize: z.coerce.number().int().positive().max(50).optional(),
        sentiment: z.enum(['VERY_NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE', 'VERY_POSITIVE']).optional(),
      }),
    }),
    asyncHandler(async (req, res) => {
      const q = req.query as { page?: number; pageSize?: number; sentiment?: string };
      const pageReq = normalizePageRequest({ page: q.page, pageSize: q.pageSize });
      const where: Prisma.NewsArticleWhereInput = q.sentiment
        ? { sentiment: q.sentiment as Prisma.NewsArticleWhereInput['sentiment'] }
        : {};
      const [rows, total] = await db.$transaction([
        db.newsArticle.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip: (pageReq.page - 1) * pageReq.pageSize,
          take: pageReq.pageSize,
        }),
        db.newsArticle.count({ where }),
      ]);
      sendPage(
        res,
        buildPage(
          rows.map((n) => ({
            id: n.id,
            title: n.title,
            url: n.url,
            summary: n.summary,
            source: n.sourceId,
            sentiment: n.sentiment,
            impact: n.impact,
            publishedAt: n.publishedAt.toISOString(),
          })),
          total,
          pageReq,
        ),
      );
    }),
  );

  router.get(
    '/sources',
    asyncHandler(async (_req, res) => {
      const sources = await db.newsSource.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
      sendOk(res, sources.map((s) => ({ id: s.id, name: s.name, type: s.type })));
    }),
  );

  return router;
}
