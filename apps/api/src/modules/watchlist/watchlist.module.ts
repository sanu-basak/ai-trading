import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { createInstrumentRepository } from '../instruments';
import { PrismaWatchlistRepository } from './infrastructure/prisma-watchlist.repository';
import {
  AddWatchlistItemCommand,
  AddWatchlistItemHandler,
  CreateWatchlistCommand,
  CreateWatchlistHandler,
  DeleteWatchlistCommand,
  DeleteWatchlistHandler,
  GetWatchlistHandler,
  GetWatchlistQuery,
  ListWatchlistsHandler,
  ListWatchlistsQuery,
  RemoveWatchlistItemCommand,
  RemoveWatchlistItemHandler,
  ReorderWatchlistItemsCommand,
  ReorderWatchlistItemsHandler,
  UpdateWatchlistCommand,
  UpdateWatchlistHandler,
} from './application';
import { WatchlistController } from './interface/watchlist.controller';
import { watchlistRoutes } from './interface/watchlist.routes';

export function registerWatchlistModule(container: AppContainer): Router {
  const { prisma, commandBus, queryBus } = container.cradle;
  const db = prisma.client as unknown as PrismaClient;
  const repo = new PrismaWatchlistRepository(db);
  const instrumentRepo = createInstrumentRepository(container);

  commandBus.register(CreateWatchlistCommand, new CreateWatchlistHandler(repo));
  commandBus.register(UpdateWatchlistCommand, new UpdateWatchlistHandler(repo));
  commandBus.register(DeleteWatchlistCommand, new DeleteWatchlistHandler(repo));
  commandBus.register(
    AddWatchlistItemCommand,
    new AddWatchlistItemHandler(repo, instrumentRepo),
  );
  commandBus.register(RemoveWatchlistItemCommand, new RemoveWatchlistItemHandler(repo));
  commandBus.register(ReorderWatchlistItemsCommand, new ReorderWatchlistItemsHandler(repo));
  queryBus.register(ListWatchlistsQuery, new ListWatchlistsHandler(repo));
  queryBus.register(GetWatchlistQuery, new GetWatchlistHandler(repo));

  const controller = new WatchlistController(commandBus, queryBus);
  return watchlistRoutes(container, controller);
}
