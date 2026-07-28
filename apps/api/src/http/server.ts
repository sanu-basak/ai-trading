import { createServer, type Server } from 'node:http';
import { buildContainer, type AppContainer } from '../di';
import { createApp } from './app';

export interface RunningServer {
  server: Server;
  container: AppContainer;
  shutdown: (signal?: string) => Promise<void>;
}

/**
 * Boots the API: connects infrastructure, registers health probes, attaches the
 * Socket.io gateway, starts listening, and installs graceful-shutdown handlers.
 */
export async function bootstrap(): Promise<RunningServer> {
  const container = buildContainer();
  const { config, logger, prisma, redis, healthRegistry, socketServer, queueService } =
    container.cradle;

  // Connect infrastructure before accepting traffic.
  await prisma.connect();
  await redis.connect();

  healthRegistry.register('postgres', () => prisma.ping());
  healthRegistry.register('redis', () => redis.ping());

  const app = createApp(container);
  const server = createServer(app);
  socketServer.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(config.env.PORT, () => {
      logger.info(
        { port: config.env.PORT, env: config.env.NODE_ENV },
        `DEVQUANTIC API listening on port ${config.env.PORT}`,
      );
      resolve();
    });
  });

  let shuttingDown = false;
  const shutdown = async (signal?: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown initiated');

    // Stop accepting new connections.
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await socketServer.close();
    await queueService.closeAll();
    await redis.disconnect();
    await prisma.disconnect();

    logger.info('Shutdown complete');
  };

  const onSignal = (signal: string): void => {
    void shutdown(signal).then(() => process.exit(0)).catch((err) => {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    });
  };
  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('unhandledRejection', (reason) =>
    logger.error({ reason }, 'Unhandled promise rejection'),
  );
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    void shutdown('uncaughtException').finally(() => process.exit(1));
  });

  return { server, container, shutdown };
}
