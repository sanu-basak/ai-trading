import type { Page, PageRequest } from '../../../shared/domain';
import type { PaperAccount } from './paper-account.entity';
import type { PositionState } from './fill-math';

export interface PaperAccountWithCounts {
  account: PaperAccount;
  openPositions: number;
}

export interface PositionRecord {
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
  /** Signed quantity: positive long, negative short. */
  quantity: number;
  avgEntryPrice: number;
  realizedPnl: number;
}

export interface OrderRecord {
  id: string;
  instrumentId: string;
  symbol: string;
  side: string;
  type: string;
  status: string;
  quantity: number;
  filledQty: number;
  limitPrice: number | null;
  avgFillPrice: number | null;
  placedAt: string;
}

export interface TradeRecord {
  id: string;
  instrumentId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  fees: number;
  pnl: number | null;
  executedAt: string;
}

export interface ExecuteFillInput {
  accountId: string;
  instrumentId: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  limitPrice: number | null;
  fillPrice: number;
  fees: number;
  realizedPnl: number;
  newPosition: PositionState;
  newCashBalance: number;
}

export interface CreateOpenOrderInput {
  accountId: string;
  instrumentId: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  limitPrice: number;
}

export interface IPaperRepository {
  createAccount(account: PaperAccount): Promise<void>;
  findAccountById(id: string): Promise<PaperAccount | null>;
  findAccountsByUser(userId: string): Promise<PaperAccountWithCounts[]>;
  countAccountsByUser(userId: string): Promise<number>;
  deleteAccount(id: string): Promise<void>;

  getPosition(accountId: string, instrumentId: string): Promise<PositionState | null>;
  listPositions(accountId: string): Promise<PositionRecord[]>;
  listOrders(accountId: string, page: PageRequest, openOnly?: boolean): Promise<Page<OrderRecord>>;
  listTrades(accountId: string, page: PageRequest): Promise<Page<TradeRecord>>;
  findOrder(accountId: string, orderId: string): Promise<OrderRecord | null>;
  cancelOrder(accountId: string, orderId: string): Promise<boolean>;

  /** Atomically books a fill: order + trade + position + account + ledger. */
  executeFill(input: ExecuteFillInput): Promise<{ orderId: string; tradeId: string }>;
  createOpenOrder(input: CreateOpenOrderInput): Promise<{ orderId: string }>;
}
