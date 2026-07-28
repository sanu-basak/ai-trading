import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { PrismaSessionRepository, PrismaUserRepository } from '../auth/infrastructure';
import {
  GetUserHandler,
  GetUserQuery,
  ListUsersHandler,
  ListUsersQuery,
  UpdateProfileCommand,
  UpdateProfileHandler,
  UpdateUserStatusCommand,
  UpdateUserStatusHandler,
} from './application';
import { UsersController } from './interface/users.controller';
import { usersRoutes } from './interface/users.routes';

/** Composition root for the users module. */
export function registerUsersModule(container: AppContainer): Router {
  const { prisma, commandBus, queryBus } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const userRepo = new PrismaUserRepository(db);
  const sessionRepo = new PrismaSessionRepository(db);

  commandBus.register(UpdateProfileCommand, new UpdateProfileHandler(userRepo));
  commandBus.register(
    UpdateUserStatusCommand,
    new UpdateUserStatusHandler(userRepo, sessionRepo),
  );
  queryBus.register(ListUsersQuery, new ListUsersHandler(userRepo));
  queryBus.register(GetUserQuery, new GetUserHandler(userRepo));

  const controller = new UsersController(commandBus, queryBus);
  return usersRoutes(container, controller);
}
