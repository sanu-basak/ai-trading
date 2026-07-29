import type { Page, PageRequest } from '../../../shared/domain';

export interface SignalReasonJson {
  name: string;
  direction: string;
  weight: number;
  contribution: number;
  detail: string;
}

export interface SignalTargetJson {
  price: number;
  rr: number;
  label: string;
}

export interface PatternInput {
  name: string;
  category: string; // PatternCategory enum value
  direction: string | null; // TrendDirection enum value or null
  confidence: number;
  detail: string;
}

export interface LevelInput {
  kind: string;
  price: number;
  strength: number;
  label: string | null;
}

export interface PatternDto {
  name: string;
  category: string;
  direction: string | null;
  confidence: number;
  detail: string | null;
}

export interface LevelDto {
  kind: string;
  price: number;
  strength: number;
  label: string | null;
}

export interface CreateSignalInput {
  userId: string;
  instrumentId: string;
  type: 'BUY' | 'SELL' | 'NO_TRADE' | 'WATCH';
  timeframe: string; // Prisma Timeframe enum value, e.g. "D1"
  confidence: number;
  entry: number | null;
  stopLoss: number | null;
  targets: SignalTargetJson[];
  riskReward: number | null;
  holdingPeriod: string | null;
  marketRegime: string | null;
  trend: string | null;
  reasons: SignalReasonJson[];
  indicators: Record<string, unknown>;
  rejection: string[];
  summary: string | null;
  modelVersion: string | null;
  expiresAt: Date | null;
  patterns: PatternInput[];
  levels: LevelInput[];
}

export interface SignalRecord {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  timeframe: string;
  confidence: number;
  entry: number | null;
  stopLoss: number | null;
  targets: SignalTargetJson[];
  riskReward: number | null;
  holdingPeriod: string | null;
  marketRegime: string | null;
  trend: string | null;
  reasons: SignalReasonJson[];
  indicators: Record<string, unknown>;
  rejection: string[];
  summary: string | null;
  modelVersion: string | null;
  generatedAt: string;
  patterns: PatternDto[];
  levels: LevelDto[];
}

export interface SignalListFilter extends PageRequest {
  instrumentId?: string;
  type?: string;
}

export interface ISignalRepository {
  create(input: CreateSignalInput): Promise<string>;
  findById(id: string, userId: string): Promise<SignalRecord | null>;
  listByUser(userId: string, filter: SignalListFilter): Promise<Page<SignalRecord>>;
}
