import { z } from 'zod';

export const createWatchlistSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'color must be a hex code')
    .nullable()
    .optional(),
});

export const updateWatchlistSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    color: z
      .string()
      .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'color must be a hex code')
      .nullable()
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: 'Provide at least one field to update',
  });

export const watchlistIdParamSchema = z.object({
  id: z.string().min(1),
});

export const watchlistItemParamSchema = z.object({
  id: z.string().min(1),
  instrumentId: z.string().min(1),
});

export const addItemSchema = z.object({
  instrumentId: z.string().min(1),
  note: z.string().trim().max(280).nullable().optional(),
});

export const reorderSchema = z.object({
  instrumentIds: z.array(z.string().min(1)).min(1).max(200),
});
