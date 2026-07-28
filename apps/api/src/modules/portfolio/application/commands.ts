import type { ICommand, ICommandHandler } from '../../../shared/application';
import { ConflictError, DomainError, NotFoundError, ValidationError } from '../../../shared/errors';
import type { IInstrumentReadRepository } from '../../instruments';
import { Portfolio } from '../domain/portfolio.entity';
import type { IPortfolioRepository } from '../domain/portfolio.repository';
import { applyToHolding, type PortfolioTxType } from '../domain/position-math';
import { toPortfolioDto, type PortfolioDto } from './dto';

export const MAX_PORTFOLIOS_PER_USER = 20;

async function loadOwned(
  repo: IPortfolioRepository,
  id: string,
  userId: string,
): Promise<Portfolio> {
  const portfolio = await repo.findById(id);
  if (!portfolio || !portfolio.isOwnedBy(userId)) throw new NotFoundError('Portfolio');
  return portfolio;
}

export class CreatePortfolioCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly name: string,
    readonly baseCurrency?: string,
  ) {}
}

export class CreatePortfolioHandler implements ICommandHandler<CreatePortfolioCommand, PortfolioDto> {
  constructor(private readonly repo: IPortfolioRepository) {}

  async execute(command: CreatePortfolioCommand): Promise<PortfolioDto> {
    if ((await this.repo.countByUser(command.userId)) >= MAX_PORTFOLIOS_PER_USER) {
      throw new DomainError(`You can have at most ${MAX_PORTFOLIOS_PER_USER} portfolios`);
    }
    if (await this.repo.nameExists(command.userId, command.name.trim())) {
      throw new ConflictError('A portfolio with this name already exists');
    }
    const result = Portfolio.create({
      userId: command.userId,
      name: command.name,
      baseCurrency: command.baseCurrency,
    });
    if (result.isFailure) throw new ValidationError(result.getError());
    const portfolio = result.getValue();
    await this.repo.create(portfolio);
    return toPortfolioDto(portfolio, 0);
  }
}

export class UpdatePortfolioCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
    readonly name: string,
  ) {}
}

export class UpdatePortfolioHandler implements ICommandHandler<UpdatePortfolioCommand, PortfolioDto> {
  constructor(private readonly repo: IPortfolioRepository) {}

  async execute(command: UpdatePortfolioCommand): Promise<PortfolioDto> {
    const portfolio = await loadOwned(this.repo, command.id, command.userId);
    if (await this.repo.nameExists(command.userId, command.name.trim(), command.id)) {
      throw new ConflictError('A portfolio with this name already exists');
    }
    const renamed = portfolio.rename(command.name);
    if (renamed.isFailure) throw new ValidationError(renamed.getError());
    await this.repo.save(portfolio);
    return toPortfolioDto(portfolio, 0);
  }
}

export class DeletePortfolioCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class DeletePortfolioHandler implements ICommandHandler<DeletePortfolioCommand, void> {
  constructor(private readonly repo: IPortfolioRepository) {}
  async execute(command: DeletePortfolioCommand): Promise<void> {
    await loadOwned(this.repo, command.id, command.userId);
    await this.repo.delete(command.id);
  }
}

export class AddTransactionCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly portfolioId: string,
    readonly instrumentId: string,
    readonly type: PortfolioTxType,
    readonly quantity: number,
    readonly price: number,
    readonly fees: number,
    readonly executedAt: Date,
    readonly note?: string | null,
  ) {}
}

/**
 * Records a BUY / SELL / DIVIDEND and updates the resulting holding atomically.
 * All position math is delegated to the pure domain function so the invariant
 * (cannot sell more than held; average-cost recomputation) is enforced in one place.
 */
export class AddTransactionHandler implements ICommandHandler<AddTransactionCommand, void> {
  constructor(
    private readonly repo: IPortfolioRepository,
    private readonly instrumentRepo: IInstrumentReadRepository,
  ) {}

  async execute(command: AddTransactionCommand): Promise<void> {
    const portfolio = await loadOwned(this.repo, command.portfolioId, command.userId);
    if (!(await this.instrumentRepo.existsById(command.instrumentId))) {
      throw new NotFoundError('Instrument');
    }

    const current = await this.repo.getHolding(command.portfolioId, command.instrumentId);
    const result = applyToHolding(current, {
      type: command.type,
      quantity: command.quantity,
      price: command.price,
      fees: command.fees,
      amount: command.type === 'DIVIDEND' ? command.price * command.quantity : undefined,
    });
    if (result.error) throw new DomainError(result.error);

    await this.repo.recordTransaction({
      portfolioId: command.portfolioId,
      instrumentId: command.instrumentId,
      type: command.type,
      quantity: command.quantity,
      price: command.price,
      fees: command.fees,
      amount: result.cashImpact,
      note: command.note ?? null,
      executedAt: command.executedAt,
      currency: portfolio.baseCurrency,
      nextHolding: result.next,
    });
  }
}
