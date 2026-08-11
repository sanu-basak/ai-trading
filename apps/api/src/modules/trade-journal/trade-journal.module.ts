import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { createInstrumentRepository } from '../instruments';
import { PrismaJournalRepository } from './infrastructure';
import {
  CloseJournalTradeCommand,
  CloseJournalTradeHandler,
  CreateJournalTradeCommand,
  CreateJournalTradeHandler,
  DeleteJournalTradeCommand,
  DeleteJournalTradeHandler,
  GetJournalTradeHandler,
  GetJournalTradeQuery,
  JournalStatsHandler,
  JournalStatsQuery,
  ListJournalTradesHandler,
  ListJournalTradesQuery,
  ReviewJournalTradeCommand,
  ReviewJournalTradeHandler,
} from './application';
import { JournalController } from './interface/journal.controller';
import { journalRoutes } from './interface/journal.routes';

export function registerTradeJournalModule(container: AppContainer): Router {
  const { prisma, commandBus, queryBus } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const repo = new PrismaJournalRepository(db);
  const instrumentRepo = createInstrumentRepository(container);

  commandBus.register(
    CreateJournalTradeCommand,
    new CreateJournalTradeHandler(repo, instrumentRepo),
  );
  commandBus.register(CloseJournalTradeCommand, new CloseJournalTradeHandler(repo));
  commandBus.register(ReviewJournalTradeCommand, new ReviewJournalTradeHandler(repo));
  commandBus.register(DeleteJournalTradeCommand, new DeleteJournalTradeHandler(repo));
  queryBus.register(ListJournalTradesQuery, new ListJournalTradesHandler(repo));
  queryBus.register(GetJournalTradeQuery, new GetJournalTradeHandler(repo));
  queryBus.register(JournalStatsQuery, new JournalStatsHandler(repo));

  const controller = new JournalController(commandBus, queryBus);
  return journalRoutes(container, controller);
}
