import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { createInstrumentRepository } from '../instruments';
import { PrismaPortfolioRepository } from './infrastructure/prisma-portfolio.repository';
import {
  AddTransactionCommand,
  AddTransactionHandler,
  CreatePortfolioCommand,
  CreatePortfolioHandler,
  DeletePortfolioCommand,
  DeletePortfolioHandler,
  GetPortfolioHandler,
  GetPortfolioQuery,
  ListPortfoliosHandler,
  ListPortfoliosQuery,
  ListPortfolioTransactionsHandler,
  ListPortfolioTransactionsQuery,
  UpdatePortfolioCommand,
  UpdatePortfolioHandler,
} from './application';
import { PortfolioController } from './interface/portfolio.controller';
import { portfolioRoutes } from './interface/portfolio.routes';

export function registerPortfolioModule(container: AppContainer): Router {
  const { prisma, commandBus, queryBus, marketDataService, logger } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const repo = new PrismaPortfolioRepository(db);
  const instrumentRepo = createInstrumentRepository(container);

  commandBus.register(CreatePortfolioCommand, new CreatePortfolioHandler(repo));
  commandBus.register(UpdatePortfolioCommand, new UpdatePortfolioHandler(repo));
  commandBus.register(DeletePortfolioCommand, new DeletePortfolioHandler(repo));
  commandBus.register(AddTransactionCommand, new AddTransactionHandler(repo, instrumentRepo));
  queryBus.register(ListPortfoliosQuery, new ListPortfoliosHandler(repo));
  queryBus.register(
    ListPortfolioTransactionsQuery,
    new ListPortfolioTransactionsHandler(repo),
  );
  queryBus.register(GetPortfolioQuery, new GetPortfolioHandler(repo, marketDataService, logger));

  const controller = new PortfolioController(commandBus, queryBus);
  return portfolioRoutes(container, controller);
}
