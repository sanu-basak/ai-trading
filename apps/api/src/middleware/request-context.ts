import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { requestContextStorage } from './context';

/**
 * Establishes the per-request context: assigns/propagates a correlation id and
 * runs the remainder of the request inside an AsyncLocalStorage scope so any
 * layer can read the request id and authenticated user without prop-drilling.
 */
export function requestContext(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.headers['x-request-id'];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    requestContextStorage.run({ requestId }, () => next());
  };
}
