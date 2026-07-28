import { z } from 'zod';

export const searchInstrumentsSchema = z.object({
  query: z.string().trim().max(120).optional(),
  assetClass: z
    .enum(['EQUITY', 'INDEX', 'ETF', 'CRYPTO', 'FOREX', 'COMMODITY', 'OPTION', 'FUTURE', 'BOND'])
    .optional(),
  exchangeCode: z.string().trim().max(20).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const instrumentIdParamSchema = z.object({
  id: z.string().min(1),
});
