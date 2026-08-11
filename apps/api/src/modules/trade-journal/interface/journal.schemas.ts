import { z } from 'zod';

const timeframeEnum = z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']);

export const createTradeSchema = z.object({
  instrumentId: z.string().min(1),
  side: z.enum(['LONG', 'SHORT']),
  quantity: z.number().positive(),
  entryPrice: z.number().positive(),
  entryAt: z.coerce.date(),
  stopLoss: z.number().positive().nullable().optional(),
  target: z.number().positive().nullable().optional(),
  fees: z.number().min(0).optional(),
  setup: z.string().trim().max(120).nullable().optional(),
  timeframe: timeframeEnum.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  emotionBefore: z.string().trim().max(120).nullable().optional(),
  exitPrice: z.number().positive().nullable().optional(),
  exitAt: z.coerce.date().nullable().optional(),
});

export const closeTradeSchema = z.object({
  exitPrice: z.number().positive(),
  exitAt: z.coerce.date().optional(),
  fees: z.number().min(0).optional(),
});

export const reviewTradeSchema = z
  .object({
    setup: z.string().trim().max(120).nullable().optional(),
    emotionBefore: z.string().trim().max(120).nullable().optional(),
    emotionAfter: z.string().trim().max(120).nullable().optional(),
    mistakes: z.string().trim().max(2000).nullable().optional(),
    lessons: z.string().trim().max(2000).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    ratingExecution: z.number().int().min(1).max(5).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });

export const tradeIdParamSchema = z.object({ id: z.string().min(1) });

export const listTradesQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'CANCELED']).optional(),
  instrumentId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const statsQuerySchema = z.object({
  instrumentId: z.string().min(1).optional(),
});
