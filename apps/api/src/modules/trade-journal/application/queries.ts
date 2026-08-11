import type { IQuery, IQueryHandler } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { NotFoundError } from '../../../shared/errors';
import { computeStats, type JournalStats } from '../domain/journal-math';
import type {
  IJournalRepository,
  JournalListFilter,
  JournalTradeView,
} from '../domain/journal.repository';

export class ListJournalTradesQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly filter: JournalListFilter,
  ) {}
}

export class ListJournalTradesHandler
  implements IQueryHandler<ListJournalTradesQuery, Page<JournalTradeView>>
{
  constructor(private readonly repo: IJournalRepository) {}
  execute(query: ListJournalTradesQuery): Promise<Page<JournalTradeView>> {
    return this.repo.list(query.userId, query.filter);
  }
}

export class GetJournalTradeQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class GetJournalTradeHandler
  implements IQueryHandler<GetJournalTradeQuery, JournalTradeView>
{
  constructor(private readonly repo: IJournalRepository) {}
  async execute(query: GetJournalTradeQuery): Promise<JournalTradeView> {
    const view = await this.repo.view(query.id, query.userId);
    if (!view) throw new NotFoundError('Trade');
    return view;
  }
}

export class JournalStatsQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly instrumentId?: string,
  ) {}
}

export class JournalStatsHandler implements IQueryHandler<JournalStatsQuery, JournalStats> {
  constructor(private readonly repo: IJournalRepository) {}
  async execute(query: JournalStatsQuery): Promise<JournalStats> {
    const trades = await this.repo.closedStats(query.userId, query.instrumentId);
    return computeStats(trades);
  }
}
