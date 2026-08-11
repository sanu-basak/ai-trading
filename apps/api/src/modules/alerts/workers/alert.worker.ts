import { QUEUE_NAMES } from '../../../shared/infrastructure/queue';
import type { AppContainer } from '../../../di';
import type { AlertEvaluationService } from '../application';

const EVALUATION_INTERVAL_MS = 30_000;

/**
 * Registers the BullMQ worker that evaluates alerts and schedules a repeatable
 * job to run it every 30s. Must be called after Redis is connected (from the
 * server bootstrap), not during route construction.
 */
export async function startAlertWorker(
  container: AppContainer,
  evaluationService: AlertEvaluationService,
): Promise<void> {
  const { queueService, logger } = container.cradle;

  queueService.registerWorker(
    QUEUE_NAMES.ALERTS,
    async () => evaluationService.evaluateAll(),
    { concurrency: 1 },
  );

  const queue = queueService.getQueue(QUEUE_NAMES.ALERTS);
  await queue.add(
    'evaluate',
    {},
    {
      repeat: { every: EVALUATION_INTERVAL_MS },
      jobId: 'alert-evaluation',
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );

  logger.info({ intervalMs: EVALUATION_INTERVAL_MS }, 'Alert evaluation worker started');
}
