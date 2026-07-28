import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { Page } from '../shared/domain/repository';

/** Standard success envelope returned by every endpoint. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
}

export function sendOk<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  const body: ApiSuccess<T> = { success: true, data, requestId: res.req.requestId };
  if (meta) body.meta = meta;
  res.status(StatusCodes.OK).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(StatusCodes.CREATED).json({ success: true, data, requestId: res.req.requestId });
}

export function sendNoContent(res: Response): void {
  res.status(StatusCodes.NO_CONTENT).send();
}

/** Sends a paginated collection with pagination metadata. */
export function sendPage<T>(res: Response, page: Page<T>): void {
  res.status(StatusCodes.OK).json({
    success: true,
    data: page.items,
    meta: {
      pagination: {
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
        totalPages: page.totalPages,
      },
    },
    requestId: res.req.requestId,
  });
}
