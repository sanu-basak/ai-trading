import { Router } from 'express';
import type { AppContainer } from '../../di';
import { registerModules } from '../../modules';
import { sendOk } from '../response';

/**
 * Aggregates all versioned API routers under `/api/v1`. Feature modules register
 * their CQRS handlers and expose a router via {@link registerModules}.
 */
export function createApiRouter(container: AppContainer): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    sendOk(res, {
      name: 'DEVQUANTIC AI Trading Analyst API',
      version: 'v1',
      status: 'ok',
      docs: '/docs',
    });
  });

  for (const mod of registerModules(container)) {
    router.use(mod.path, mod.router);
  }

  return router;
}
