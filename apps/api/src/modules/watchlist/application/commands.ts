import type { ICommand, ICommandHandler } from '../../../shared/application';
import { ConflictError, DomainError, NotFoundError, ValidationError } from '../../../shared/errors';
import type { IInstrumentReadRepository } from '../../instruments';
import { Watchlist } from '../domain/watchlist.entity';
import type { IWatchlistRepository } from '../domain/watchlist.repository';
import { toWatchlistDto, type WatchlistDto } from './dto';

export const MAX_WATCHLISTS_PER_USER = 50;
export const MAX_ITEMS_PER_WATCHLIST = 200;

/** Loads a watchlist and asserts the caller owns it (else 404, no leak). */
async function loadOwned(
  repo: IWatchlistRepository,
  id: string,
  userId: string,
): Promise<Watchlist> {
  const watchlist = await repo.findById(id);
  if (!watchlist || !watchlist.isOwnedBy(userId)) {
    throw new NotFoundError('Watchlist');
  }
  return watchlist;
}

export class CreateWatchlistCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly name: string,
    readonly color?: string | null,
  ) {}
}

export class CreateWatchlistHandler implements ICommandHandler<CreateWatchlistCommand, WatchlistDto> {
  constructor(private readonly repo: IWatchlistRepository) {}

  async execute(command: CreateWatchlistCommand): Promise<WatchlistDto> {
    if ((await this.repo.countByUser(command.userId)) >= MAX_WATCHLISTS_PER_USER) {
      throw new DomainError(`You can have at most ${MAX_WATCHLISTS_PER_USER} watchlists`);
    }
    if (await this.repo.nameExists(command.userId, command.name.trim())) {
      throw new ConflictError('A watchlist with this name already exists');
    }
    const result = Watchlist.create({
      userId: command.userId,
      name: command.name,
      color: command.color ?? null,
    });
    if (result.isFailure) throw new ValidationError(result.getError());
    const watchlist = result.getValue();
    await this.repo.create(watchlist);
    return toWatchlistDto(watchlist, 0);
  }
}

export class UpdateWatchlistCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
    readonly name?: string,
    readonly color?: string | null,
  ) {}
}

export class UpdateWatchlistHandler implements ICommandHandler<UpdateWatchlistCommand, WatchlistDto> {
  constructor(private readonly repo: IWatchlistRepository) {}

  async execute(command: UpdateWatchlistCommand): Promise<WatchlistDto> {
    const watchlist = await loadOwned(this.repo, command.id, command.userId);
    if (command.name !== undefined) {
      if (await this.repo.nameExists(command.userId, command.name.trim(), command.id)) {
        throw new ConflictError('A watchlist with this name already exists');
      }
      const renamed = watchlist.rename(command.name);
      if (renamed.isFailure) throw new ValidationError(renamed.getError());
    }
    if (command.color !== undefined) {
      watchlist.setColor(command.color);
    }
    await this.repo.save(watchlist);
    const itemCount = await this.repo.countItems(command.id);
    return toWatchlistDto(watchlist, itemCount);
  }
}

export class DeleteWatchlistCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class DeleteWatchlistHandler implements ICommandHandler<DeleteWatchlistCommand, void> {
  constructor(private readonly repo: IWatchlistRepository) {}

  async execute(command: DeleteWatchlistCommand): Promise<void> {
    await loadOwned(this.repo, command.id, command.userId);
    await this.repo.delete(command.id);
  }
}

export class AddWatchlistItemCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly watchlistId: string,
    readonly instrumentId: string,
    readonly note?: string | null,
  ) {}
}

export class AddWatchlistItemHandler implements ICommandHandler<AddWatchlistItemCommand, void> {
  constructor(
    private readonly repo: IWatchlistRepository,
    private readonly instrumentRepo: IInstrumentReadRepository,
  ) {}

  async execute(command: AddWatchlistItemCommand): Promise<void> {
    await loadOwned(this.repo, command.watchlistId, command.userId);
    if (!(await this.instrumentRepo.existsById(command.instrumentId))) {
      throw new NotFoundError('Instrument');
    }
    if (await this.repo.itemExists(command.watchlistId, command.instrumentId)) {
      throw new ConflictError('Instrument is already in this watchlist');
    }
    if ((await this.repo.countItems(command.watchlistId)) >= MAX_ITEMS_PER_WATCHLIST) {
      throw new DomainError(`A watchlist can hold at most ${MAX_ITEMS_PER_WATCHLIST} instruments`);
    }
    await this.repo.addItem(command.watchlistId, command.instrumentId, command.note ?? null);
  }
}

export class RemoveWatchlistItemCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly watchlistId: string,
    readonly instrumentId: string,
  ) {}
}

export class RemoveWatchlistItemHandler
  implements ICommandHandler<RemoveWatchlistItemCommand, void>
{
  constructor(private readonly repo: IWatchlistRepository) {}

  async execute(command: RemoveWatchlistItemCommand): Promise<void> {
    await loadOwned(this.repo, command.watchlistId, command.userId);
    await this.repo.removeItem(command.watchlistId, command.instrumentId);
  }
}

export class ReorderWatchlistItemsCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly watchlistId: string,
    readonly instrumentIds: string[],
  ) {}
}

export class ReorderWatchlistItemsHandler
  implements ICommandHandler<ReorderWatchlistItemsCommand, void>
{
  constructor(private readonly repo: IWatchlistRepository) {}

  async execute(command: ReorderWatchlistItemsCommand): Promise<void> {
    await loadOwned(this.repo, command.watchlistId, command.userId);
    await this.repo.reorderItems(command.watchlistId, command.instrumentIds);
  }
}
