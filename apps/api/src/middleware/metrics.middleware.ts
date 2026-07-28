import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { MetricsService } from '../shared/infrastructure/monitoring';

/**
 * Records request throughput and latency into Prometheus. Uses the matched
 * route pattern (not the raw URL) as the `route` label to keep cardinality low.
 */
export function httpMetrics(metrics: MetricsService): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!metrics.enabled) return next();
    const end = metrics.httpRequestDuration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : req.path.replace(/\/[0-9a-f]{8,}/gi, '/:id');
      const labels = {
        method: req.method,
        route,
        status: String(res.statusCode),
      };
      metrics.httpRequestsTotal.inc(labels);
      end(labels);
    });
    next();
  };
}
