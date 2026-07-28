import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { NotFoundError } from '../shared/errors';

/** Catch-all for unmatched routes — forwards a typed 404 to the error handler. */
export function notFound(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    next(new NotFoundError('Route', `Cannot ${req.method} ${req.path}`));
  };
}
