// Shared API contract types (mirror of the backend DTOs).

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { pagination?: Pagination };
  requestId?: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Auth ---
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  createdAt: string;
}

export interface AuthResult {
  user: UserProfile;
  tokens: AuthTokens;
}

// --- Instruments ---
export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: { code: string; name: string };
  currency: string;
  sector: string | null;
  lotSize: number;
  tickSize: number;
  isTradable: boolean;
  isActive: boolean;
}

// --- Signals ---
export type SignalType = 'BUY' | 'SELL' | 'NO_TRADE' | 'WATCH';

export interface SignalReason {
  name: string;
  direction: string;
  weight: number;
  contribution: number;
  detail: string;
}

export interface SignalTarget {
  price: number;
  rr: number;
  label: string;
}

export interface SignalPattern {
  name: string;
  category: string;
  direction: string | null;
  confidence: number;
  detail: string | null;
}

export interface SignalLevel {
  kind: string;
  price: number;
  strength: number;
  label: string | null;
}

export interface Signal {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  exchange: string;
  type: SignalType;
  timeframe: string;
  confidence: number;
  entry: number | null;
  stopLoss: number | null;
  targets: SignalTarget[];
  riskReward: number | null;
  holdingPeriod: string | null;
  marketRegime: string | null;
  trend: string | null;
  reasons: SignalReason[];
  indicators: Record<string, number | null>;
  patterns: SignalPattern[];
  levels: SignalLevel[];
  rejection: string[];
  summary: string | null;
  modelVersion: string | null;
  generatedAt: string;
  disclaimer?: string;
}

// --- Multi-timeframe ---
export interface MtfFrame {
  timeframe: string;
  signal: SignalType;
  confidence: number;
  trend: string;
  score: number;
}

export interface MtfResult {
  symbol: string;
  signal: SignalType;
  confidence: number;
  compositeScore: number;
  alignment: string;
  frames: MtfFrame[];
  summary: string;
  disclaimer: string;
}

// --- Watchlist ---
export interface Watchlist {
  id: string;
  name: string;
  color: string | null;
  isDefault: boolean;
  sortOrder: number;
  itemCount: number;
  createdAt: string;
}

export interface WatchlistItem {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
  note: string | null;
  sortOrder: number;
}

export interface WatchlistDetail extends Watchlist {
  items: WatchlistItem[];
}

// --- Alerts ---
export type AlertOperator = 'ABOVE' | 'BELOW' | 'CROSSES_ABOVE' | 'CROSSES_BELOW';

export interface AlertCondition {
  kind: 'PRICE';
  operator: AlertOperator;
  value: number;
}

export interface Alert {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  type: string;
  status: string;
  condition: AlertCondition;
  channels: string[];
  isRepeating: boolean;
  triggerCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

// --- Notifications ---
export interface Notification {
  id: string;
  category: string;
  channel: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// --- Backtesting ---
export interface EquityPoint {
  index: number;
  equity: number;
  drawdownPct: number;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  strategy: string;
  initialCapital: number;
  finalEquity: number;
  metrics: Record<string, number | null>;
  trades: Array<Record<string, number | string>>;
  equityCurve: EquityPoint[];
  summary: string;
  disclaimer: string;
}

// --- Trade journal ---
export interface JournalTrade {
  id: string;
  instrumentId: string;
  symbol: string;
  name: string;
  exchange: string;
  side: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED' | 'CANCELED';
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
  notes: string | null;
  createdAt: string;
}

export interface JournalStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  avgRMultiple: number | null;
  largestWin: number;
  largestLoss: number;
}

// --- Paper trading ---
export interface PaperAccount {
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

export interface PaperPosition {
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  realizedPnl: number;
}

export interface PaperAccountDetail extends PaperAccount {
  positions: PaperPosition[];
  summary: {
    cashBalance: number;
    positionsValue: number;
    equity: number;
    unrealizedPnl: number;
    realizedPnl: number;
    totalReturn: number;
    totalReturnPct: number;
    unpricedCount: number;
  };
}

export interface PlaceOrderResult {
  status: 'FILLED' | 'OPEN';
  orderId: string;
  fillPrice: number | null;
  realizedPnl: number | null;
}
