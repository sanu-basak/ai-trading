import { Router } from 'express';
import type { AppContainer } from '../../../di';
import {
  asyncHandler,
  authenticate,
  createAuthRateLimiter,
  validate,
} from '../../../middleware';
import type { AuthController } from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas';

/**
 * Wires the auth controller to the router. Public endpoints are throttled with
 * a stricter auth rate limiter; `/me`, `/logout`, and `/password/change` require
 * a valid access token.
 */
export function authRoutes(container: AppContainer, controller: AuthController): Router {
  const { tokenService, redis, config } = container.cradle;
  const router = Router();
  const authLimiter = createAuthRateLimiter(redis, config);
  const requireAuth = authenticate(tokenService);

  router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(controller.register));
  router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
  router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(controller.refresh));
  router.post('/logout', requireAuth, validate({ body: logoutSchema }), asyncHandler(controller.logout));
  router.get('/me', requireAuth, asyncHandler(controller.me));

  router.post('/verify-email', validate({ body: verifyEmailSchema }), asyncHandler(controller.verifyEmail));
  router.post(
    '/password/forgot',
    authLimiter,
    validate({ body: forgotPasswordSchema }),
    asyncHandler(controller.forgotPassword),
  );
  router.post(
    '/password/reset',
    authLimiter,
    validate({ body: resetPasswordSchema }),
    asyncHandler(controller.resetPassword),
  );
  router.post(
    '/password/change',
    requireAuth,
    validate({ body: changePasswordSchema }),
    asyncHandler(controller.changePassword),
  );

  return router;
}
