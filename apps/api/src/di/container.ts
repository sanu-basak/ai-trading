import { asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';

import { AppConfig } from '../shared/infrastructure/config';
import { createLogger, type Logger } from '../shared/infrastructure/logger';
import { PrismaService, UnitOfWork } from '../shared/infrastructure/database';
import { CacheService, RedisService } from '../shared/infrastructure/cache';
import { QueueService } from '../shared/infrastructure/queue';
import {
  CryptoService,
  PasswordService,
  TokenService,
} from '../shared/infrastructure/security';
import { SocketServer } from '../shared/infrastructure/websocket';
import { HealthRegistry, MetricsService } from '../shared/infrastructure/monitoring';
import { CommandBus, InMemoryEventBus, QueryBus } from '../shared/application';
import {
  MarketDataService,
  ProviderRegistry,
  RedisRateLimiter,
} from '../market-data';
import { OpenApiRegistry } from '../http/openapi';

/**
 * The typed dependency graph (awilix "cradle"). Every service resolvable from
 * the container is declared here, giving compile-time safety at every call site.
 */
export interface Cradle {
  config: AppConfig;
  logger: Logger;
  prisma: PrismaService;
  redis: RedisService;
  cache: CacheService;
  eventBus: InMemoryEventBus;
  commandBus: CommandBus;
  queryBus: QueryBus;
  unitOfWork: UnitOfWork;
  queueService: QueueService;
  passwordService: PasswordService;
  tokenService: TokenService;
  cryptoService: CryptoService;
  socketServer: SocketServer;
  healthRegistry: HealthRegistry;
  metricsService: MetricsService;
  providerRegistry: ProviderRegistry;
  rateLimiter: RedisRateLimiter;
  marketDataService: MarketDataService;
  openApiRegistry: OpenApiRegistry;
}

export type AppContainer = AwilixContainer<Cradle>;

/**
 * Builds and wires the application container. Registrations use explicit
 * factories (`asFunction`) so wiring is unambiguous and independent of
 * constructor parameter names. Everything is a singleton for the process
 * lifetime. Feature-module handlers/repositories are registered on top of this
 * base container in Step 4.
 */
export function buildContainer(config: AppConfig = AppConfig.load()): AppContainer {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY });

  container.register({
    config: asValue(config),
    logger: asFunction(({ config: c }: Cradle) => createLogger(c)).singleton(),
    prisma: asFunction(({ config: c, logger }: Cradle) => new PrismaService(c, logger)).singleton(),
    redis: asFunction(({ config: c, logger }: Cradle) => new RedisService(c, logger)).singleton(),
    cache: asFunction(({ redis, logger }: Cradle) => new CacheService(redis, logger)).singleton(),
    eventBus: asFunction(({ logger }: Cradle) => new InMemoryEventBus(logger)).singleton(),
    commandBus: asFunction(({ logger }: Cradle) => new CommandBus(logger)).singleton(),
    queryBus: asFunction(({ logger }: Cradle) => new QueryBus(logger)).singleton(),
    unitOfWork: asFunction(
      ({ prisma, eventBus }: Cradle) => new UnitOfWork(prisma, eventBus),
    ).singleton(),
    queueService: asFunction(
      ({ config: c, logger }: Cradle) => new QueueService(c, logger),
    ).singleton(),
    passwordService: asFunction(() => new PasswordService()).singleton(),
    tokenService: asFunction(({ config: c }: Cradle) => new TokenService(c)).singleton(),
    cryptoService: asFunction(({ config: c }: Cradle) => new CryptoService(c)).singleton(),
    socketServer: asFunction(
      ({ config: c, logger, tokenService }: Cradle) => new SocketServer(c, logger, tokenService),
    ).singleton(),
    healthRegistry: asFunction(({ logger }: Cradle) => new HealthRegistry(logger)).singleton(),
    metricsService: asFunction(({ config: c }: Cradle) => new MetricsService(c)).singleton(),
    providerRegistry: asFunction(({ logger }: Cradle) => new ProviderRegistry(logger)).singleton(),
    rateLimiter: asFunction(({ redis }: Cradle) => new RedisRateLimiter(redis)).singleton(),
    marketDataService: asFunction(
      ({ providerRegistry, cache, rateLimiter, logger }: Cradle) =>
        new MarketDataService(providerRegistry, cache, rateLimiter, logger),
    ).singleton(),
    openApiRegistry: asFunction(() => new OpenApiRegistry()).singleton(),
  });

  return container;
}
