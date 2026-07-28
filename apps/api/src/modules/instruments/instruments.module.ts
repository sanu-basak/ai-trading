import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { PrismaInstrumentReadRepository } from './infrastructure/prisma-instrument.repository';
import {
  GetInstrumentHandler,
  GetInstrumentQuery,
  ListExchangesHandler,
  ListExchangesQuery,
  SearchInstrumentsHandler,
  SearchInstrumentsQuery,
} from './application';
import { InstrumentsController } from './interface/instruments.controller';
import { instrumentsRoutes } from './interface/instruments.routes';

/** Shared factory so other modules (watchlist, market-data) reuse the repo. */
export function createInstrumentRepository(container: AppContainer): PrismaInstrumentReadRepository {
  const db = container.cradle.prisma.client as unknown as PrismaClient;
  return new PrismaInstrumentReadRepository(db);
}

export function registerInstrumentsModule(container: AppContainer): Router {
  const { queryBus } = container.cradle;
  const repo = createInstrumentRepository(container);

  queryBus.register(SearchInstrumentsQuery, new SearchInstrumentsHandler(repo));
  queryBus.register(GetInstrumentQuery, new GetInstrumentHandler(repo));
  queryBus.register(ListExchangesQuery, new ListExchangesHandler(repo));

  const controller = new InstrumentsController(queryBus);
  return instrumentsRoutes(container, controller);
}
