import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import {
  PrismaSessionRepository,
  PrismaUserRepository,
  PrismaVerificationTokenRepository,
} from './infrastructure';
import {
  AuthTokenService,
  ChangePasswordCommand,
  ChangePasswordHandler,
  GetMeHandler,
  GetMeQuery,
  LoginCommand,
  LoginHandler,
  LogoutCommand,
  LogoutHandler,
  RefreshTokenCommand,
  RefreshTokenHandler,
  RegisterUserCommand,
  RegisterUserHandler,
  RequestPasswordResetCommand,
  RequestPasswordResetHandler,
  ResetPasswordCommand,
  ResetPasswordHandler,
  VerifyEmailCommand,
  VerifyEmailHandler,
} from './application';
import { AuthController } from './interface/auth.controller';
import { authRoutes } from './interface/auth.routes';
import { registerAuthOpenApi } from './interface/auth.openapi';

/**
 * Composition root for the auth module: constructs repositories and services,
 * registers CQRS handlers on the shared buses, documents the API surface, and
 * returns the module router to mount under `/api/v1/auth`.
 */
export function registerAuthModule(container: AppContainer): Router {
  const {
    prisma,
    passwordService,
    cryptoService,
    tokenService,
    config,
    commandBus,
    queryBus,
    eventBus,
    logger,
    openApiRegistry,
  } = container.cradle;

  const db = prisma.client as unknown as PrismaClient;
  const userRepo = new PrismaUserRepository(db);
  const sessionRepo = new PrismaSessionRepository(db);
  const verificationTokenRepo = new PrismaVerificationTokenRepository(db);
  const authTokenService = new AuthTokenService(tokenService, sessionRepo, cryptoService, config);

  commandBus.register(
    RegisterUserCommand,
    new RegisterUserHandler(
      userRepo,
      verificationTokenRepo,
      passwordService,
      cryptoService,
      authTokenService,
      eventBus,
      logger,
    ),
  );
  commandBus.register(
    LoginCommand,
    new LoginHandler(userRepo, passwordService, authTokenService, eventBus, logger),
  );
  commandBus.register(
    RefreshTokenCommand,
    new RefreshTokenHandler(userRepo, sessionRepo, tokenService, authTokenService, logger),
  );
  commandBus.register(LogoutCommand, new LogoutHandler(sessionRepo, authTokenService));
  commandBus.register(
    ChangePasswordCommand,
    new ChangePasswordHandler(userRepo, sessionRepo, passwordService, eventBus),
  );
  commandBus.register(
    VerifyEmailCommand,
    new VerifyEmailHandler(userRepo, verificationTokenRepo, cryptoService, eventBus),
  );
  commandBus.register(
    RequestPasswordResetCommand,
    new RequestPasswordResetHandler(userRepo, verificationTokenRepo, cryptoService, logger),
  );
  commandBus.register(
    ResetPasswordCommand,
    new ResetPasswordHandler(
      userRepo,
      sessionRepo,
      verificationTokenRepo,
      passwordService,
      cryptoService,
      eventBus,
    ),
  );
  queryBus.register(GetMeQuery, new GetMeHandler(userRepo));

  registerAuthOpenApi(openApiRegistry);

  const controller = new AuthController(commandBus, queryBus, config);
  return authRoutes(container, controller);
}
