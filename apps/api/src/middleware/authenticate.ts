import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from '../shared/errors';
import type { TokenService } from '../shared/infrastructure/security';
import { getRequestContext, type AuthenticatedUser } from './context';

export interface AuthenticateOptions {
  /** When true, requests without a token proceed unauthenticated. */
  optional?: boolean;
}

/**
 * Verifies the Bearer access token and attaches the authenticated user to the
 * request and the ambient request context.
 */
export function authenticate(
  tokenService: TokenService,
  options: AuthenticateOptions = {},
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      if (options.optional) return next();
      throw new UnauthorizedError();
    }

    const token = header.slice(7);
    const claims = tokenService.verifyAccessToken(token); // throws typed UnauthorizedError

    const user: AuthenticatedUser = {
      id: claims.sub,
      email: claims.email,
      roles: claims.roles,
      permissions: claims.permissions,
    };
    req.user = user;
    const ctx = getRequestContext();
    if (ctx) ctx.user = user;

    next();
  };
}
