import { z } from 'zod';

const timeframeEnum = z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']);

export const analyzeSchema = z.object({
  instrumentId: z.string().min(1),
  timeframe: timeframeEnum.default('1d'),
});

export const listSignalsQuerySchema = z.object({
  instrumentId: z.string().min(1).optional(),
  type: z.enum(['BUY', 'SELL', 'NO_TRADE', 'WATCH']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const signalIdParamSchema = z.object({
  id: z.string().min(1),
});
