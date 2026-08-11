import { UpstreamError } from '../../../shared/errors';
import type { Logger } from '../../../shared/infrastructure/logger';

/** OHLCV candle in the shape the Python engine expects. */
export interface AiCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AiAnalyzeRequest {
  symbol: string;
  exchange?: string;
  timeframe: string;
  candles: AiCandle[];
}

export interface AiFactor {
  name: string;
  direction: string;
  weight: number;
  contribution: number;
  detail: string;
}

export interface AiTarget {
  price: number;
  rr: number;
  label: string;
}

export interface AiPattern {
  name: string;
  category: string;
  direction: string;
  confidence: number;
  bar_offset: number;
  detail: string;
}

export interface AiLevel {
  kind: string;
  price: number;
  strength: number;
  distance_pct: number;
}

export interface AiAnalyzeResponse {
  symbol: string;
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'NO_TRADE' | 'WATCH';
  confidence: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  market_regime: string;
  entry: number | null;
  stop_loss: number | null;
  targets: AiTarget[];
  risk_reward: number | null;
  holding_period: string | null;
  reasons: AiFactor[];
  rejection: string[];
  indicators: Record<string, unknown>;
  patterns: AiPattern[];
  levels: AiLevel[];
  summary: string;
  generated_at: string;
  model_version: string;
  disclaimer: string;
}

export interface AiMtfFrameRequest {
  timeframe: string;
  candles: AiCandle[];
}

export interface AiMtfRequest {
  symbol: string;
  exchange?: string;
  frames: AiMtfFrameRequest[];
}

export interface AiMtfFrame {
  timeframe: string;
  signal: string;
  confidence: number;
  trend: string;
  score: number;
}

export interface AiMtfResponse {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NO_TRADE' | 'WATCH';
  confidence: number;
  composite_score: number;
  alignment: string;
  frames: AiMtfFrame[];
  summary: string;
  generated_at: string;
  model_version: string;
  disclaimer: string;
}

export interface AiSmcRequest {
  symbol: string;
  exchange?: string;
  timeframe: string;
  candles: AiCandle[];
}

export interface AiSmcResponse {
  symbol: string;
  timeframe: string;
  structure: string;
  bias: string;
  last_event: { kind: string; direction: string; price: number; index: number } | null;
  premium_discount: {
    zone: string;
    equilibrium: number;
    range_high: number;
    range_low: number;
  } | null;
  order_blocks: Array<{ kind: string; top: number; bottom: number; index: number; mitigated: boolean }>;
  fair_value_gaps: Array<{ kind: string; top: number; bottom: number; index: number; filled: boolean }>;
  liquidity: Array<{ kind: string; price: number; touches: number }>;
  summary: string;
  disclaimer: string;
}

export interface AiBacktestRequest {
  symbol: string;
  exchange?: string;
  timeframe: string;
  candles: AiCandle[];
  strategy: string;
  params?: Record<string, unknown>;
  initial_capital?: number;
  commission_bps?: number;
}

export interface AiEquityPoint {
  index: number;
  equity: number;
  drawdown_pct: number;
}

export interface AiBacktestResponse {
  symbol: string;
  timeframe: string;
  strategy: string;
  initial_capital: number;
  final_equity: number;
  metrics: Record<string, number | null>;
  trades: Array<Record<string, number | string>>;
  equity_curve: AiEquityPoint[];
  summary: string;
  disclaimer: string;
}

/**
 * Typed client for the Python AI engine. The Node API remains the owner of
 * market data — it fetches real candles and hands them to this analysis-only
 * service, preserving the "never fabricate data" boundary.
 */
export class AiEngineClient {
  constructor(
    private readonly baseUrl: string,
    private readonly logger: Logger,
    private readonly timeoutMs = 15_000,
  ) {}

  async analyze(request: AiAnalyzeRequest): Promise<AiAnalyzeResponse> {
    return this.post<AiAnalyzeResponse>('/api/v1/analysis/analyze', request);
  }

  async analyzeMtf(request: AiMtfRequest): Promise<AiMtfResponse> {
    return this.post<AiMtfResponse>('/api/v1/analysis/analyze-mtf', request);
  }

  async analyzeSmc(request: AiSmcRequest): Promise<AiSmcResponse> {
    return this.post<AiSmcResponse>('/api/v1/analysis/analyze-smc', request);
  }

  async backtest(request: AiBacktestRequest): Promise<AiBacktestResponse> {
    return this.post<AiBacktestResponse>('/api/v1/analysis/backtest', request);
  }

  async health(): Promise<boolean> {
    try {
      await this.post('/health', undefined, 'GET');
      return true;
    } catch {
      return false;
    }
  }

  private async post<T>(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(new URL(path, this.baseUrl), {
        method,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new UpstreamError(`AI engine responded ${res.status}`, {
          details: { status: res.status, body: detail.slice(0, 500) },
        });
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      this.logger.error({ err }, 'AI engine request failed');
      throw new UpstreamError('AI engine is unavailable', { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }
}
