import type { ICommand, ICommandHandler } from '../../../shared/application';
import { ConflictError, DomainError, NotFoundError, ValidationError } from '../../../shared/errors';
import type { IInstrumentReadRepository } from '../../instruments';
import { PaperAccount } from '../domain/paper-account.entity';
import type { IPaperRepository } from '../domain/paper.repository';
import { OrderExecutionService } from './order-execution.service';
import { toPaperAccountDto, type PaperAccountDto, type PlaceOrderResultDto } from './dto';

export const MAX_PAPER_ACCOUNTS = 10;

async function loadOwnedAccount(
  repo: IPaperRepository,
  id: string,
  userId: string,
): Promise<PaperAccount> {
  const account = await repo.findAccountById(id);
  if (!account || !account.isOwnedBy(userId)) throw new NotFoundError('Paper account');
  return account;
}

export class CreatePaperAccountCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly name: string,
    readonly startingCapital: number,
    readonly currency?: string,
  ) {}
}

export class CreatePaperAccountHandler
  implements ICommandHandler<CreatePaperAccountCommand, PaperAccountDto>
{
  constructor(private readonly repo: IPaperRepository) {}

  async execute(command: CreatePaperAccountCommand): Promise<PaperAccountDto> {
    if ((await this.repo.countAccountsByUser(command.userId)) >= MAX_PAPER_ACCOUNTS) {
      throw new DomainError(`You can have at most ${MAX_PAPER_ACCOUNTS} paper accounts`);
    }
    const result = PaperAccount.create({
      userId: command.userId,
      name: command.name,
      startingCapital: command.startingCapital,
      currency: command.currency,
    });
    if (result.isFailure) throw new ValidationError(result.getError());
    const account = result.getValue();
    await this.repo.createAccount(account);
    return toPaperAccountDto(account, 0);
  }
}

export class DeletePaperAccountCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
  ) {}
}

export class DeletePaperAccountHandler
  implements ICommandHandler<DeletePaperAccountCommand, void>
{
  constructor(private readonly repo: IPaperRepository) {}
  async execute(command: DeletePaperAccountCommand): Promise<void> {
    await loadOwnedAccount(this.repo, command.accountId, command.userId);
    await this.repo.deleteAccount(command.accountId);
  }
}

export class PlaceOrderCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
    readonly instrumentId: string,
    readonly side: 'BUY' | 'SELL',
    readonly type: 'MARKET' | 'LIMIT',
    readonly quantity: number,
    readonly limitPrice?: number,
  ) {}
}

export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand, PlaceOrderResultDto> {
  constructor(
    private readonly repo: IPaperRepository,
    private readonly instrumentRepo: IInstrumentReadRepository,
    private readonly execution: OrderExecutionService,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<PlaceOrderResultDto> {
    const account = await loadOwnedAccount(this.repo, command.accountId, command.userId);
    if (!account.isActive) throw new DomainError('This paper account is inactive');

    const instrument = await this.instrumentRepo.findById(command.instrumentId);
    if (!instrument) throw new NotFoundError('Instrument');

    return this.execution.place({
      account,
      instrument: {
        id: instrument.id,
        symbol: instrument.symbol,
        exchange: instrument.exchange.code,
        assetClass: instrument.assetClass,
      },
      side: command.side,
      type: command.type,
      quantity: command.quantity,
      limitPrice: command.limitPrice,
    });
  }
}

export class CancelOrderCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
    readonly orderId: string,
  ) {}
}

export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, void> {
  constructor(private readonly repo: IPaperRepository) {}
  async execute(command: CancelOrderCommand): Promise<void> {
    await loadOwnedAccount(this.repo, command.accountId, command.userId);
    const canceled = await this.repo.cancelOrder(command.accountId, command.orderId);
    if (!canceled) throw new ConflictError('Order is not open or does not exist');
  }
}
