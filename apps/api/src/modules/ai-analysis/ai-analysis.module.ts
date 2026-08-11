import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { AppContainer } from '../../di';
import { createInstrumentRepository } from '../instruments';
import { AiEngineClient, PrismaSignalRepository } from './infrastructure';
import {
  AnalyzeInstrumentCommand,
  AnalyzeInstrumentHandler,
  AnalyzeInstrumentMtfCommand,
  AnalyzeInstrumentMtfHandler,
  GetSignalHandler,
  GetSignalQuery,
  ListSignalsHandler,
  ListSignalsQuery,
} from './application';
import { AiAnalysisController } from './interface/ai.controller';
import { aiAnalysisRoutes } from './interface/ai.routes';

export function registerAiAnalysisModule(container: AppContainer): Router {
  const { prisma, config, logger, commandBus, queryBus, marketDataService, socketServer } =
    container.cradle;
  const db = prisma.client as unknown as PrismaClient;

  const signalRepo = new PrismaSignalRepository(db);
  const instrumentRepo = createInstrumentRepository(container);
  const aiClient = new AiEngineClient(config.env.AI_ENGINE_URL, logger);

  commandBus.register(
    AnalyzeInstrumentCommand,
    new AnalyzeInstrumentHandler(
      instrumentRepo,
      marketDataService,
      aiClient,
      signalRepo,
      socketServer,
      logger,
    ),
  );
  commandBus.register(
    AnalyzeInstrumentMtfCommand,
    new AnalyzeInstrumentMtfHandler(instrumentRepo, marketDataService, aiClient, logger),
  );
  queryBus.register(ListSignalsQuery, new ListSignalsHandler(signalRepo));
  queryBus.register(GetSignalQuery, new GetSignalHandler(signalRepo));

  const controller = new AiAnalysisController(commandBus, queryBus);
  return aiAnalysisRoutes(container, controller);
}
