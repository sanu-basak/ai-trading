import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import type { AppConfig } from '../config';

/**
 * Prometheus metrics registry. Exposes default Node/process metrics plus HTTP
 * request throughput and latency. Scraped at `/metrics` (guarded in production).
 */
export class MetricsService {
  readonly registry: Registry;
  readonly httpRequestsTotal: Counter<'method' | 'route' | 'status'>;
  readonly httpRequestDuration: Histogram<'method' | 'route' | 'status'>;
  readonly enabled: boolean;

  constructor(config: AppConfig) {
    this.enabled = config.env.METRICS_ENABLED;
    this.registry = new Registry();
    this.registry.setDefaultLabels({ service: 'devquantic-api', env: config.env.NODE_ENV });

    if (this.enabled) {
      collectDefaultMetrics({ register: this.registry });
    }

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'] as const,
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
