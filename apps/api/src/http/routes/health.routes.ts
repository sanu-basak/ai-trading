import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../middleware/async-handler';
import type { HealthRegistry, MetricsService } from '../../shared/infrastructure/monitoring';

/**
 * Operational endpoints (unauthenticated). `/health` aggregates dependency
 * probes for the load balancer; `/metrics` exposes Prometheus metrics.
 */
export function healthRoutes(health: HealthRegistry, metrics: MetricsService): Router {
  const router = Router();

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const report = await health.check();
      res.status(report.status === 'up' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json(report);
    }),
  );

  router.get(
    '/metrics',
    asyncHandler(async (_req, res) => {
      if (!metrics.enabled) {
        res.status(StatusCodes.NOT_FOUND).end();
        return;
      }
      res.setHeader('Content-Type', metrics.contentType);
      res.send(await metrics.render());
    }),
  );

  return router;
}
