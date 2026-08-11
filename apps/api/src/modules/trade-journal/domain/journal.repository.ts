import type { Page, PageRequest } from '../../../shared/domain';
import type { JournalTrade } from './journal-trade.entity';
import type { StatTrade } from './journal-math';

export interface JournalTradeView {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  exchange: string;
  side: string;
  status: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  target: number | null;
  entryAt: string;
  exitAt: string | null;
  fees: number;
  pnl: number | null;
  pnlPct: number | null;
  rMultiple: number | null;
  setup: string | null;
  timeframe: string | null;
  emotionBefore: string | null;
  emotionAfter: string | null;
  mistakes: string | null;
  lessons: string | null;
  notes: string | null;
  ratingExecution: number | null;
  createdAt: string;
}

export interface JournalListFilter extends PageRequest {
  status?: string;
  instrumentId?: string;
}

export interface IJournalRepository {
  create(trade: JournalTrade): Promise<void>;
  save(trade: JournalTrade): Promise<void>;
  findById(id: string): Promise<JournalTrade | null>;
  view(id: string, userId: string): Promise<JournalTradeView | null>;
  list(userId: string, filter: JournalListFilter): Promise<Page<JournalTradeView>>;
  delete(id: string): Promise<void>;
  /** All closed-trade P&L / R data for stats aggregation. */
  closedStats(userId: string, instrumentId?: string): Promise<StatTrade[]>;
}
