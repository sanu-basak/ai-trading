import { z } from 'zod';

export const createPortfolioSchema = z.object({
  name: z.string().trim().min(1).max(60),
  baseCurrency: z.string().length(3).optional(),
});

export const updatePortfolioSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const portfolioIdParamSchema = z.object({
  id: z.string().min(1),
});

export const addTransactionSchema = z.object({
  instrumentId: z.string().min(1),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND']),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  fees: z.number().nonnegative().optional().default(0),
  executedAt: z.coerce.date().optional(),
  note: z.string().trim().max(280).nullable().optional(),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
