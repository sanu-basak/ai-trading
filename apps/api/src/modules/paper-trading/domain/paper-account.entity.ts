import { AggregateRoot, Result, UniqueEntityID } from '../../../shared/domain';

export interface PaperAccountProps {
  userId: string;
  name: string;
  currency: string;
  startingCapital: number;
  cashBalance: number;
  realizedPnl: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaperAccountInput {
  userId: string;
  name: string;
  startingCapital: number;
  currency?: string;
}

const MIN_CAPITAL = 1;
const MAX_CAPITAL = 1_000_000_000;

/** A simulated trading account holding cash and realized P&L. */
export class PaperAccount extends AggregateRoot<PaperAccountProps> {
  private constructor(props: PaperAccountProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }
  get currency(): string {
    return this.props.currency;
  }
  get cashBalance(): number {
    return this.props.cashBalance;
  }
  get realizedPnl(): number {
    return this.props.realizedPnl;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }

  static create(input: CreatePaperAccountInput): Result<PaperAccount, string> {
    const name = input.name?.trim();
    if (!name) return Result.fail('Account name is required');
    if (input.startingCapital < MIN_CAPITAL || input.startingCapital > MAX_CAPITAL) {
      return Result.fail(`Starting capital must be between ${MIN_CAPITAL} and ${MAX_CAPITAL}`);
    }
    const now = new Date();
    return Result.ok(
      new PaperAccount({
        userId: input.userId,
        name,
        currency: (input.currency ?? 'INR').toUpperCase(),
        startingCapital: input.startingCapital,
        cashBalance: input.startingCapital,
        realizedPnl: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  static reconstitute(props: PaperAccountProps, id: UniqueEntityID): PaperAccount {
    return new PaperAccount(props, id);
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  /** Applies the cash and realized-P&L deltas produced by a fill. */
  applyFill(cashDelta: number, realizedDelta: number): void {
    this.props.cashBalance += cashDelta;
    this.props.realizedPnl += realizedDelta;
    this.props.updatedAt = new Date();
  }

  hasSufficientCash(amount: number): boolean {
    return this.props.cashBalance + 1e-6 >= amount;
  }

  toPersistenceProps(): Readonly<PaperAccountProps> {
    return this.props;
  }
}
