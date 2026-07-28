import type { Logger } from '../logger';

export type HealthStatus = 'up' | 'down';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  checks: HealthCheckResult[];
}

type ProbeFn = () => Promise<boolean>;

/**
 * Registry of liveness/readiness probes. Dependencies (db, redis, …) register a
 * probe; `/health` aggregates them into a single report used by the load
 * balancer and orchestrator.
 */
export class HealthRegistry {
  private readonly probes = new Map<string, ProbeFn>();
  private readonly startedAt = Date.now();

  constructor(private readonly logger: Logger) {}

  register(name: string, probe: ProbeFn): void {
    this.probes.set(name, probe);
  }

  async check(): Promise<HealthReport> {
    const checks = await Promise.all(
      [...this.probes.entries()].map(async ([name, probe]) => {
        const start = Date.now();
        try {
          const ok = await probe();
          return {
            name,
            status: ok ? 'up' : 'down',
            latencyMs: Date.now() - start,
          } satisfies HealthCheckResult;
        } catch (err) {
          this.logger.warn({ err, probe: name }, 'Health probe failed');
          return {
            name,
            status: 'down',
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
          } satisfies HealthCheckResult;
        }
      }),
    );

    const status: HealthStatus = checks.every((c) => c.status === 'up') ? 'up' : 'down';
    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      checks,
    };
  }
}
