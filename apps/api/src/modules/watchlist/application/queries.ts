import type { IQuery, IQueryHandler } from '../../../shared/application';
import { NotFoundError } from '../../../shared/errors';
import type { IWatchlistRepository } from '../domain/watchlist.repository';
import { toItemDto, toWatchlistDto, type WatchlistDetailDto, type WatchlistDto } from './dto';

export class ListWatchlistsQuery implements IQuery {
  constructor(readonly userId: string) {}
}

export class ListWatchlistsHandler implements IQueryHandler<ListWatchlistsQuery, WatchlistDto[]> {
  constructor(private readonly repo: IWatchlistRepository) {}

  async execute(query: ListWatchlistsQuery): Promise<WatchlistDto[]> {
    const rows = await this.repo.findByUser(query.userId);
    return rows.map((r) => toWatchlistDto(r.watchlist, r.itemCount));
  }
}

export class GetWatchlistQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class GetWatchlistHandler implements IQueryHandler<GetWatchlistQuery, WatchlistDetailDto> {
  constructor(private readonly repo: IWatchlistRepository) {}

  async execute(query: GetWatchlistQuery): Promise<WatchlistDetailDto> {
    const watchlist = await this.repo.findById(query.id);
    if (!watchlist || !watchlist.isOwnedBy(query.userId)) {
      throw new NotFoundError('Watchlist');
    }
    const items = await this.repo.listItems(query.id);
    return { ...toWatchlistDto(watchlist, items.length), items: items.map(toItemDto) };
  }
}
