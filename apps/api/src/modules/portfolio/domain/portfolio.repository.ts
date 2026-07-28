import type { Page, PageRequest } from '../../../shared/domain';
import type { Portfolio } from './portfolio.entity';
import type { HoldingState, PortfolioTxType } from './position-math';

/** A holding joined with its instrument reference (read shape). */
export interface HoldingRecord {
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
  quantity: number;
  avgCost: number;
  realizedPnl: number;
}

export interface TransactionRecord {
  id: string;
  instrumentId: string | null;
  symbol: string | null;
  type: PortfolioTxType | string;
  quantity: number | null;
  price: number | null;
  amount: number;
  fees: number;
  note: string | null;
  executedAt: string;
}

export interface RecordTransactionInput {
  portfolioId: string;
  instrumentId: string;
  type: PortfolioTxType;
  quantity: number;
  price: number;
  fees: number;
  amount: number; // signed cash impact
  note: string | null;
  executedAt: Date;
  currency: string;
  nextHolding: HoldingState;
}

export interface PortfolioWithCounts {
  portfolio: Portfolio;
  holdingCount: number;
}

export interface IPortfolioRepository {
  create(portfolio: Portfolio): Promise<void>;
  save(portfolio: Portfolio): Promise<void>;
  findById(id: string): Promise<Portfolio | null>;
  findByUser(userId: string): Promise<PortfolioWithCounts[]>;
  delete(id: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
  nameExists(userId: string, name: string, excludeId?: string): Promise<boolean>;

  getHolding(portfolioId: string, instrumentId: string): Promise<HoldingState | null>;
  listHoldings(portfolioId: string): Promise<HoldingRecord[]>;
  listTransactions(portfolioId: string, page: PageRequest): Promise<Page<TransactionRecord>>;

  /** Atomically records a transaction and upserts the resulting holding. */
  recordTransaction(input: RecordTransactionInput): Promise<void>;
}
