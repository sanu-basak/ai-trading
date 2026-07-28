import express, { type Express, json, urlencoded } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import type { AppContainer } from '../di';
import {
  createRateLimiter,
  errorHandler,
  httpMetrics,
  notFound,
  requestContext,
  requestLogger,
} from '../middleware';
import { healthRoutes } from './routes/health.routes';
import { createApiRouter } from './routes';

/**
 * Builds the Express application with the full middleware pipeline in the
 * correct order:
 *   security → parsing → context/correlation → logging → metrics → rate limit
 *   → operational routes → API routes → docs → 404 → error handler.
 */
export function createApp(container: AppContainer): Express {
  const { config, logger, redis, healthRegistry, metricsService, openApiRegistry } =
    container.cradle;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // --- Security & parsing ---
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true }));
  app.use(cookieParser());

  // --- Observability ---
  app.use(requestContext());
  app.use(requestLogger(logger));
  app.use(httpMetrics(metricsService));

  // --- Operational endpoints (before rate limiting) ---
  app.use('/', healthRoutes(healthRegistry, metricsService));

  // --- Global rate limit for the API surface ---
  app.use('/api', createRateLimiter(redis, config));

  // --- Versioned API ---
  app.use('/api/v1', createApiRouter(container));

  // --- API docs (Swagger UI) ---
  if (config.env.SWAGGER_ENABLED) {
    const document = openApiRegistry.build(config);
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: 'DEVQUANTIC API' }));
    app.get('/openapi.json', (_req, res) => res.json(document));
  }

  // --- Fallbacks ---
  app.use(notFound());
  app.use(errorHandler(logger, config));

  return app;
}
