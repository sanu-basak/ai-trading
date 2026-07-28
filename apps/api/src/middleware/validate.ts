import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../shared/errors';

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates and coerces request parts against Zod schemas. On success the parsed
 * (typed) values replace the raw ones; on failure a {@link ValidationError} with
 * a flattened field map is thrown.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // req.query is a getter in some setups; assign via defineProperty-safe cast.
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('Request validation failed', err.flatten());
      }
      throw err;
    }
  };
}
