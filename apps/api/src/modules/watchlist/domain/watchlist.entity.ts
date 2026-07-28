import { AggregateRoot, Result, UniqueEntityID } from '../../../shared/domain';

export interface WatchlistProps {
  userId: string;
  name: string;
  color: string | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWatchlistInput {
  userId: string;
  name: string;
  color?: string | null;
  isDefault?: boolean;
  sortOrder?: number;
}

const MAX_NAME_LENGTH = 60;

/** A user's named collection of instruments. Items are managed via the repo. */
export class Watchlist extends AggregateRoot<WatchlistProps> {
  private constructor(props: WatchlistProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get isDefault(): boolean {
    return this.props.isDefault;
  }

  static create(input: CreateWatchlistInput): Result<Watchlist, string> {
    const name = input.name?.trim();
    if (!name) return Result.fail('Watchlist name is required');
    if (name.length > MAX_NAME_LENGTH) {
      return Result.fail(`Watchlist name must be at most ${MAX_NAME_LENGTH} characters`);
    }
    const now = new Date();
    return Result.ok(
      new Watchlist({
        userId: input.userId,
        name,
        color: input.color ?? null,
        isDefault: input.isDefault ?? false,
        sortOrder: input.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  static reconstitute(props: WatchlistProps, id: UniqueEntityID): Watchlist {
    return new Watchlist(props, id);
  }

  rename(name: string): Result<void, string> {
    const trimmed = name.trim();
    if (!trimmed) return Result.fail('Watchlist name is required');
    if (trimmed.length > MAX_NAME_LENGTH) {
      return Result.fail(`Watchlist name must be at most ${MAX_NAME_LENGTH} characters`);
    }
    this.props.name = trimmed;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  setColor(color: string | null): void {
    this.props.color = color;
    this.props.updatedAt = new Date();
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  toPersistenceProps(): Readonly<WatchlistProps> {
    return this.props;
  }
}
