import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().max(80).nullable().optional(),
  lastName: z.string().trim().max(80).nullable().optional(),
  displayName: z.string().trim().max(160).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  country: z.string().length(2).nullable().optional(),
  timezone: z.string().max(64).optional(),
  locale: z.string().max(10).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED']).optional(),
  search: z.string().trim().max(120).optional(),
  sortBy: z.string().max(40).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED']),
});
