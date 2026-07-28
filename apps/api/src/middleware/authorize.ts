import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';
import { hasAllPermissions, hasAnyPermission, hasRole } from '../shared/infrastructure/security';

/** Requires the authenticated user to hold ALL of the given permissions. */
export function authorize(required: string | string[]): RequestHandler {
  const permissions = Array.isArray(required) ? required : [required];
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) throw new UnauthorizedError();
    if (!hasAllPermissions(user.permissions, permissions)) {
      throw new ForbiddenError();
    }
    next();
  };
}

/** Requires the authenticated user to hold ANY of the given permissions. */
export function authorizeAny(required: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) throw new UnauthorizedError();
    if (!hasAnyPermission(user.permissions, required)) {
      throw new ForbiddenError();
    }
    next();
  };
}

/** Requires the authenticated user to hold at least one of the given roles. */
export function requireRole(roles: string | string[]): RequestHandler {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) throw new UnauthorizedError();
    if (!allowed.some((r) => hasRole(user.roles, r))) {
      throw new ForbiddenError();
    }
    next();
  };
}
