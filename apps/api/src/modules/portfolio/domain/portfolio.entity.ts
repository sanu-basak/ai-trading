import { AggregateRoot, Result, UniqueEntityID } from '../../../shared/domain';

export interface PortfolioProps {
  userId: string;
  name: string;
  baseCurrency: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePortfolioInput {
  userId: string;
  name: string;
  baseCurrency?: string;
  isDefault?: boolean;
}

const MAX_NAME_LENGTH = 60;

/** A user's holdings book. Holdings & transactions are managed via the repo. */
export class Portfolio extends AggregateRoot<PortfolioProps> {
  private constructor(props: PortfolioProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }
  get baseCurrency(): string {
    return this.props.baseCurrency;
  }

  static create(input: CreatePortfolioInput): Result<Portfolio, string> {
    const name = input.name?.trim();
    if (!name) return Result.fail('Portfolio name is required');
    if (name.length > MAX_NAME_LENGTH) {
      return Result.fail(`Portfolio name must be at most ${MAX_NAME_LENGTH} characters`);
    }
    const now = new Date();
    return Result.ok(
      new Portfolio({
        userId: input.userId,
        name,
        baseCurrency: (input.baseCurrency ?? 'INR').toUpperCase(),
        isDefault: input.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  static reconstitute(props: PortfolioProps, id: UniqueEntityID): Portfolio {
    return new Portfolio(props, id);
  }

  rename(name: string): Result<void, string> {
    const trimmed = name.trim();
    if (!trimmed) return Result.fail('Portfolio name is required');
    if (trimmed.length > MAX_NAME_LENGTH) {
      return Result.fail(`Portfolio name must be at most ${MAX_NAME_LENGTH} characters`);
    }
    this.props.name = trimmed;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  toPersistenceProps(): Readonly<PortfolioProps> {
    return this.props;
  }
}
