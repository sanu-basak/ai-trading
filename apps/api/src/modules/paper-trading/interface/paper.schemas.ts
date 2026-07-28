import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(60),
  startingCapital: z.number().positive().max(1_000_000_000),
  currency: z.string().length(3).optional(),
});

export const accountIdParamSchema = z.object({
  id: z.string().min(1),
});

export const orderParamSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
});

export const placeOrderSchema = z
  .object({
    instrumentId: z.string().min(1),
    side: z.enum(['BUY', 'SELL']),
    type: z.enum(['MARKET', 'LIMIT']),
    quantity: z.number().positive(),
    limitPrice: z.number().positive().optional(),
  })
  .refine((v) => v.type !== 'LIMIT' || v.limitPrice !== undefined, {
    message: 'limitPrice is required for LIMIT orders',
    path: ['limitPrice'],
  });

export const listPagedSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  openOnly: z.coerce.boolean().optional(),
});
