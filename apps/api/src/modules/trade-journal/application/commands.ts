import type { ICommand, ICommandHandler } from '../../../shared/application';
import { InternalError, NotFoundError, ValidationError } from '../../../shared/errors';
import type { IInstrumentReadRepository } from '../../instruments';
import { JournalTrade, type ReviewInput } from '../domain/journal-trade.entity';
import type { TradeSide } from '../domain/journal-math';
import type { IJournalRepository, JournalTradeView } from '../domain/journal.repository';

async function loadOwned(
  repo: IJournalRepository,
  id: string,
  userId: string,
): Promise<JournalTrade> {
  const trade = await repo.findById(id);
  if (!trade || !trade.isOwnedBy(userId)) throw new NotFoundError('Trade');
  return trade;
}

async function viewOrThrow(
  repo: IJournalRepository,
  id: string,
  userId: string,
): Promise<JournalTradeView> {
  const view = await repo.view(id, userId);
  if (!view) throw new InternalError('Trade saved but could not be reloaded');
  return view;
}

export interface CreateJournalInput {
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
  exitPrice?: number | null;
  exitAt?: Date | null;
}

export class CreateJournalTradeCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly instrumentId: string,
    readonly input: CreateJournalInput,
  ) {}
}

export class CreateJournalTradeHandler
  implements ICommandHandler<CreateJournalTradeCommand, JournalTradeView>
{
  constructor(
    private readonly repo: IJournalRepository,
    private readonly instrumentRepo: IInstrumentReadRepository,
  ) {}

  async execute(command: CreateJournalTradeCommand): Promise<JournalTradeView> {
    if (!(await this.instrumentRepo.existsById(command.instrumentId))) {
      throw new NotFoundError('Instrument');
    }
    const result = JournalTrade.create({
      userId: command.userId,
      instrumentId: command.instrumentId,
      ...command.input,
    });
    if (result.isFailure) throw new ValidationError(result.getError());
    const trade = result.getValue();
    await this.repo.create(trade);
    return viewOrThrow(this.repo, trade.id.toString(), command.userId);
  }
}

export class CloseJournalTradeCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
    readonly exitPrice: number,
    readonly exitAt?: Date,
    readonly fees?: number,
  ) {}
}

export class CloseJournalTradeHandler
  implements ICommandHandler<CloseJournalTradeCommand, JournalTradeView>
{
  constructor(private readonly repo: IJournalRepository) {}

  async execute(command: CloseJournalTradeCommand): Promise<JournalTradeView> {
    const trade = await loadOwned(this.repo, command.id, command.userId);
    const closed = trade.close(command.exitPrice, command.exitAt ?? new Date(), command.fees);
    if (closed.isFailure) throw new ValidationError(closed.getError());
    await this.repo.save(trade);
    return viewOrThrow(this.repo, command.id, command.userId);
  }
}

export class ReviewJournalTradeCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
    readonly review: ReviewInput,
  ) {}
}

export class ReviewJournalTradeHandler
  implements ICommandHandler<ReviewJournalTradeCommand, JournalTradeView>
{
  constructor(private readonly repo: IJournalRepository) {}

  async execute(command: ReviewJournalTradeCommand): Promise<JournalTradeView> {
    const trade = await loadOwned(this.repo, command.id, command.userId);
    trade.review(command.review);
    await this.repo.save(trade);
    return viewOrThrow(this.repo, command.id, command.userId);
  }
}

export class DeleteJournalTradeCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class DeleteJournalTradeHandler
  implements ICommandHandler<DeleteJournalTradeCommand, void>
{
  constructor(private readonly repo: IJournalRepository) {}
  async execute(command: DeleteJournalTradeCommand): Promise<void> {
    await loadOwned(this.repo, command.id, command.userId);
    await this.repo.delete(command.id);
  }
}
