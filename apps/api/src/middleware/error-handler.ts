import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { AppConfig } from '../shared/infrastructure/config';
import type { Logger } from '../shared/infrastructure/logger';
import {
  AppError,
  ConflictError,
  InternalError,
  NotFoundError,
  ValidationError,
  isAppError,
} from '../shared/errors';

/** Normalizes any thrown value into a typed {@link AppError}. */
function normalize(err: unknown): AppError {
  if (isAppError(err)) return err;

  if (err instanceof ZodError) {
    return new ValidationError('Request validation failed', err.flatten());
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return new ConflictError('A record with these values already exists', {
          target: err.meta?.target,
        });
      case 'P2025':
        return new NotFoundError('Record');
      default:
        return new InternalError('Database request failed', err);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return new InternalError('Invalid database query', err);
  }

  return new InternalError(
    err instanceof Error ? err.message : 'An unexpected error occurred',
    err,
  );
}

/**
 * Terminal error-handling middleware. Logs with severity by class, then emits
 * the standard error envelope. Internal (non-operational) 5xx errors never leak
 * their message/stack to clients in production.
 */
export function errorHandler(logger: Logger, config: AppConfig): ErrorRequestHandler {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const appError = normalize(err);
    const logPayload = { err, requestId: req.requestId, path: req.path, code: appError.code };

    if (appError.statusCode >= 500 || !appError.isOperational) {
      logger.error(logPayload, 'Request failed');
    } else {
      logger.warn(logPayload, 'Request rejected');
    }

    const exposeInternal = appError.isOperational || config.isDevelopment;
    const body: Record<string, unknown> = {
      success: false,
      error: exposeInternal
        ? appError.toJSON()
        : { code: appError.code, message: 'Internal server error' },
      requestId: req.requestId,
    };
    if (config.isDevelopment && !appError.isOperational && err instanceof Error) {
      body.stack = err.stack;
    }

    res.status(appError.statusCode).json(body);
  };
}
