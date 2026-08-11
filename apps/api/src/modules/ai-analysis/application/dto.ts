import type { SignalRecord } from '../domain/signal.repository';

export const ANALYSIS_DISCLAIMER =
  'This is technical analysis for educational purposes only. It is not investment advice ' +
  'and does not guarantee any outcome. Trading involves substantial risk of loss.';

/** A persisted signal plus the standing disclaimer. */
export type SignalDto = SignalRecord & { disclaimer: string };

export function withDisclaimer(record: SignalRecord): SignalDto {
  return { ...record, disclaimer: ANALYSIS_DISCLAIMER };
}

export interface MtfFrameDto {
  timeframe: string;
  signal: string;
  confidence: number;
  trend: string;
  score: number;
}

export interface MtfResultDto {
  symbol: string;
  signal: string;
  confidence: number;
  compositeScore: number;
  alignment: string;
  frames: MtfFrameDto[];
  summary: string;
  disclaimer: string;
}

/** Platform timeframe string → Prisma Timeframe enum value. */
export const PRISMA_TIMEFRAME: Record<string, string> = {
  '1m': 'M1',
  '3m': 'M3',
  '5m': 'M5',
  '15m': 'M15',
  '30m': 'M30',
  '1h': 'H1',
  '4h': 'H4',
  '1d': 'D1',
  '1w': 'W1',
  '1M': 'MN1',
};

export const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
  '1M': 2_592_000_000,
};
