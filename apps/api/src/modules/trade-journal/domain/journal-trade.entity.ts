import { AggregateRoot, Result, UniqueEntityID } from '../../../shared/domain';
import { computeClose, type TradeSide } from './journal-math';

export type { TradeSide } from './journal-math';
export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELED';

export interface JournalTradeProps {
  userId: string;
  instrumentId: string;
  side: TradeSide;
  status: TradeStatus;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  target: number | null;
  entryAt: Date;
  exitAt: Date | null;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJournalTradeInput {
  userId: string;
  instrumentId: string;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  entryAt: Date;
  stopLoss?: number | null;
  target?: number | null;
  fees?: number;
  setup?: string | null;
  timeframe?: string | null;
  notes?: string | null;
  emotionBefore?: string | null;
  // If provided, the trade is logged as already closed.
  exitPrice?: number | null;
  exitAt?: Date | null;
}

export interface ReviewInput {
  setup?: string | null;
  emotionBefore?: string | null;
  emotionAfter?: string | null;
  mistakes?: string | null;
  lessons?: string | null;
  notes?: string | null;
  ratingExecution?: number | null;
}

export class JournalTrade extends AggregateRoot<JournalTradeProps> {
  private constructor(props: JournalTradeProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }
  get status(): TradeStatus {
    return this.props.status;
  }

  static create(input: CreateJournalTradeInput): Result<JournalTrade, string> {
    if (input.quantity <= 0) return Result.fail('Quantity must be positive');
    if (input.entryPrice <= 0) return Result.fail('Entry price must be positive');

    const now = new Date();
    const props: JournalTradeProps = {
      userId: input.userId,
      instrumentId: input.instrumentId,
      side: input.side,
      status: 'OPEN',
      quantity: input.quantity,
      entryPrice: input.entryPrice,
      exitPrice: null,
      stopLoss: input.stopLoss ?? null,
      target: input.target ?? null,
      entryAt: input.entryAt,
      exitAt: null,
      fees: input.fees ?? 0,
      pnl: null,
      pnlPct: null,
      rMultiple: null,
      setup: input.setup ?? null,
      timeframe: input.timeframe ?? null,
      emotionBefore: input.emotionBefore ?? null,
      emotionAfter: null,
      mistakes: null,
      lessons: null,
      notes: input.notes ?? null,
      ratingExecution: null,
      createdAt: now,
      updatedAt: now,
    };
    const trade = new JournalTrade(props);
    if (input.exitPrice != null) {
      const closed = trade.close(input.exitPrice, input.exitAt ?? now);
      if (closed.isFailure) return Result.fail(closed.getError());
    }
    return Result.ok(trade);
  }

  static reconstitute(props: JournalTradeProps, id: UniqueEntityID): JournalTrade {
    return new JournalTrade(props, id);
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  close(exitPrice: number, exitAt: Date, fees?: number): Result<void, string> {
    if (this.props.status === 'CLOSED') return Result.fail('Trade is already closed');
    if (this.props.status === 'CANCELED') return Result.fail('Trade was canceled');
    if (exitPrice <= 0) return Result.fail('Exit price must be positive');

    if (fees != null) this.props.fees = fees;
    const result = computeClose({
      side: this.props.side,
      quantity: this.props.quantity,
      entryPrice: this.props.entryPrice,
      exitPrice,
      stopLoss: this.props.stopLoss,
      fees: this.props.fees,
    });
    this.props.exitPrice = exitPrice;
    this.props.exitAt = exitAt;
    this.props.pnl = result.pnl;
    this.props.pnlPct = result.pnlPct;
    this.props.rMultiple = result.rMultiple;
    this.props.status = 'CLOSED';
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  review(input: ReviewInput): void {
    const p = this.props;
    if (input.setup !== undefined) p.setup = input.setup;
    if (input.emotionBefore !== undefined) p.emotionBefore = input.emotionBefore;
    if (input.emotionAfter !== undefined) p.emotionAfter = input.emotionAfter;
    if (input.mistakes !== undefined) p.mistakes = input.mistakes;
    if (input.lessons !== undefined) p.lessons = input.lessons;
    if (input.notes !== undefined) p.notes = input.notes;
    if (input.ratingExecution !== undefined) p.ratingExecution = input.ratingExecution;
    p.updatedAt = new Date();
  }

  toPersistenceProps(): Readonly<JournalTradeProps> {
    return this.props;
  }
}
