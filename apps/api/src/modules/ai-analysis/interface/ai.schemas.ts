import { z } from 'zod';

const timeframeEnum = z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']);

export const analyzeSchema = z.object({
  instrumentId: z.string().min(1),
  timeframe: timeframeEnum.default('1d'),
});

export const analyzeMtfSchema = z.object({
  instrumentId: z.string().min(1),
  timeframes: z.array(timeframeEnum).min(1).max(6).optional(),
});

export const backtestSchema = z.object({
  instrumentId: z.string().min(1),
  timeframe: timeframeEnum.default('1d'),
  strategy: z.enum(['ema_cross', 'rsi_reversion', 'supertrend']).default('ema_cross'),
  params: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  initialCapital: z.number().positive().max(1_000_000_000).optional(),
  commissionBps: z.number().min(0).max(1000).optional(),
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
