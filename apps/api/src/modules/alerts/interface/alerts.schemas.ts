import { z } from 'zod';

export const createAlertSchema = z.object({
  instrumentId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  operator: z.enum(['ABOVE', 'BELOW', 'CROSSES_ABOVE', 'CROSSES_BELOW']),
  value: z.number().finite(),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'TELEGRAM', 'PUSH'])).optional(),
  cooldownSec: z.number().int().min(0).max(86_400).optional(),
  isRepeating: z.boolean().optional(),
});

export const alertIdParamSchema = z.object({ id: z.string().min(1) });

export const setStatusSchema = z.object({ action: z.enum(['pause', 'resume']) });

export const notificationIdParamSchema = z.object({ id: z.string().min(1) });

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});
