import { pinoHttp } from 'pino-http';
import type { RequestHandler } from 'express';
import type { Logger } from '../shared/infrastructure/logger';

/**
 * HTTP access logging bound to the structured logger. Reuses the correlation id
 * set by {@link requestContext} and downgrades expected 4xx responses to `warn`.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req) => (req as { requestId?: string }).requestId ?? '',
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/metrics',
    },
  }) as unknown as RequestHandler;
}
