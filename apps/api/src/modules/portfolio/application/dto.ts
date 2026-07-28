import type { Portfolio } from '../domain/portfolio.entity';

export interface PortfolioDto {
  id: string;
  name: string;
  baseCurrency: string;
  isDefault: boolean;
  holdingCount: number;
  createdAt: string;
}

export interface HoldingValuationDto {
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
  quantity: number;
  avgCost: number;
  invested: number;
  /** Null when no provider can currently price this instrument (never faked). */
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  realizedPnl: number;
}

export interface PortfolioSummaryDto {
  totalInvested: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  /** Instruments that could not be priced this request. */
  unpricedCount: number;
}

export interface PortfolioDetailDto extends PortfolioDto {
  holdings: HoldingValuationDto[];
  summary: PortfolioSummaryDto;
}

export function toPortfolioDto(portfolio: Portfolio, holdingCount: number): PortfolioDto {
  const p = portfolio.toPersistenceProps();
  return {
    id: portfolio.id.toString(),
    name: p.name,
    baseCurrency: p.baseCurrency,
    isDefault: p.isDefault,
    holdingCount,
    createdAt: p.createdAt.toISOString(),
  };
}
