import type { PaperAccount } from '../domain/paper-account.entity';

export interface PaperAccountDto {
  id: string;
  name: string;
  currency: string;
  startingCapital: number;
  cashBalance: number;
  realizedPnl: number;
  openPositions: number;
  isActive: boolean;
  createdAt: string;
}

export interface PositionValuationDto {
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
  side: 'LONG' | 'SHORT';
  quantity: number; // absolute
  avgEntryPrice: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  realizedPnl: number;
}

export interface PaperAccountSummaryDto {
  cashBalance: number;
  positionsValue: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalReturn: number;
  totalReturnPct: number;
  unpricedCount: number;
}

export interface PaperAccountDetailDto extends PaperAccountDto {
  positions: PositionValuationDto[];
  summary: PaperAccountSummaryDto;
}

export interface PlaceOrderResultDto {
  status: 'FILLED' | 'OPEN';
  orderId: string;
  fillPrice: number | null;
  realizedPnl: number | null;
}

export function toPaperAccountDto(account: PaperAccount, openPositions: number): PaperAccountDto {
  const p = account.toPersistenceProps();
  return {
    id: account.id.toString(),
    name: p.name,
    currency: p.currency,
    startingCapital: p.startingCapital,
    cashBalance: p.cashBalance,
    realizedPnl: p.realizedPnl,
    openPositions,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  };
}
