import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { PrismaRiskProfileRepository } from './infrastructure/prisma-risk.repository';
import {
  GetRiskProfileHandler,
  GetRiskProfileQuery,
  PositionSizeHandler,
  PositionSizeQuery,
  UpdateRiskProfileCommand,
  UpdateRiskProfileHandler,
} from './application';
import { riskRoutes } from './interface/risk.controller';

export function registerRiskModule(container: AppContainer): Router {
  const { prisma, commandBus, queryBus } = container.cradle;
  const repo = new PrismaRiskProfileRepository(prisma.client as unknown as PrismaClient);

  queryBus.register(GetRiskProfileQuery, new GetRiskProfileHandler(repo));
  queryBus.register(PositionSizeQuery, new PositionSizeHandler(repo));
  commandBus.register(UpdateRiskProfileCommand, new UpdateRiskProfileHandler(repo));

  return riskRoutes(container);
}
