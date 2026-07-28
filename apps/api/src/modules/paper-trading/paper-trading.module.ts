import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { createInstrumentRepository } from '../instruments';
import { PrismaPaperRepository } from './infrastructure/prisma-paper.repository';
import {
  CancelOrderCommand,
  CancelOrderHandler,
  CreatePaperAccountCommand,
  CreatePaperAccountHandler,
  DeletePaperAccountCommand,
  DeletePaperAccountHandler,
  GetPaperAccountHandler,
  GetPaperAccountQuery,
  ListPaperAccountsHandler,
  ListPaperAccountsQuery,
  ListPaperOrdersHandler,
  ListPaperOrdersQuery,
  ListPaperTradesHandler,
  ListPaperTradesQuery,
  OrderExecutionService,
  PlaceOrderCommand,
  PlaceOrderHandler,
} from './application';
import { PaperTradingController } from './interface/paper.controller';
import { paperTradingRoutes } from './interface/paper.routes';

export function registerPaperTradingModule(container: AppContainer): Router {
  const { prisma, commandBus, queryBus, marketDataService, logger } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const repo = new PrismaPaperRepository(db);
  const instrumentRepo = createInstrumentRepository(container);
  const execution = new OrderExecutionService(repo, marketDataService);

  commandBus.register(CreatePaperAccountCommand, new CreatePaperAccountHandler(repo));
  commandBus.register(DeletePaperAccountCommand, new DeletePaperAccountHandler(repo));
  commandBus.register(PlaceOrderCommand, new PlaceOrderHandler(repo, instrumentRepo, execution));
  commandBus.register(CancelOrderCommand, new CancelOrderHandler(repo));
  queryBus.register(ListPaperAccountsQuery, new ListPaperAccountsHandler(repo));
  queryBus.register(GetPaperAccountQuery, new GetPaperAccountHandler(repo, marketDataService, logger));
  queryBus.register(ListPaperOrdersQuery, new ListPaperOrdersHandler(repo));
  queryBus.register(ListPaperTradesQuery, new ListPaperTradesHandler(repo));

  const controller = new PaperTradingController(commandBus, queryBus);
  return paperTradingRoutes(container, controller);
}
