import type { IQuery, IQueryHandler } from '../../../shared/application';
import type { Page, PageRequest } from '../../../shared/domain';
import { NotFoundError } from '../../../shared/errors';
import type { Logger } from '../../../shared/infrastructure/logger';
import type { MarketDataService, AssetClass as MdAssetClass } from '../../../market-data';
import type {
  IPaperRepository,
  OrderRecord,
  TradeRecord,
} from '../domain/paper.repository';
import {
  toPaperAccountDto,
  type PaperAccountDetailDto,
  type PaperAccountDto,
  type PaperAccountSummaryDto,
  type PositionValuationDto,
} from './dto';

async function assertOwned(
  repo: IPaperRepository,
  accountId: string,
  userId: string,
): Promise<void> {
  const account = await repo.findAccountById(accountId);
  if (!account || !account.isOwnedBy(userId)) throw new NotFoundError('Paper account');
}

export class ListPaperAccountsQuery implements IQuery {
  constructor(readonly userId: string) {}
}

export class ListPaperAccountsHandler
  implements IQueryHandler<ListPaperAccountsQuery, PaperAccountDto[]>
{
  constructor(private readonly repo: IPaperRepository) {}
  async execute(query: ListPaperAccountsQuery): Promise<PaperAccountDto[]> {
    const rows = await this.repo.findAccountsByUser(query.userId);
    return rows.map((r) => toPaperAccountDto(r.account, r.openPositions));
  }
}

export class GetPaperAccountQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly accountId: string,
  ) {}
}

/**
 * Returns a paper account with every open position marked to the LIVE market
 * price, plus an equity/return summary. Unpriceable positions are surfaced as
 * `currentPrice: null` — never estimated.
 */
export class GetPaperAccountHandler
  implements IQueryHandler<GetPaperAccountQuery, PaperAccountDetailDto>
{
  constructor(
    private readonly repo: IPaperRepository,
    private readonly marketData: MarketDataService,
    private readonly logger: Logger,
  ) {}

  async execute(query: GetPaperAccountQuery): Promise<PaperAccountDetailDto> {
    const account = await this.repo.findAccountById(query.accountId);
    if (!account || !account.isOwnedBy(query.userId)) throw new NotFoundError('Paper account');

    const positions = await this.repo.listPositions(query.accountId);

    const valued: PositionValuationDto[] = await Promise.all(
      positions.map(async (p) => {
        const absQty = Math.abs(p.quantity);
        let currentPrice: number | null = null;
        let marketValue: number | null = null;
        let unrealizedPnl: number | null = null;
        let unrealizedPnlPct: number | null = null;
        try {
          const quote = await this.marketData.getQuote({
            symbol: p.symbol,
            exchange: p.exchange,
            assetClass: p.assetClass as MdAssetClass,
          });
          currentPrice = quote.price;
          marketValue = p.quantity * quote.price; // signed exposure
          unrealizedPnl = (quote.price - p.avgEntryPrice) * p.quantity;
          const cost = absQty * p.avgEntryPrice;
          unrealizedPnlPct = cost !== 0 ? (unrealizedPnl / cost) * 100 : null;
        } catch (err) {
          this.logger.debug({ err, symbol: p.symbol }, 'Position could not be priced');
        }
        return {
          instrumentId: p.instrumentId,
          symbol: p.symbol,
          name: p.name,
          assetClass: p.assetClass,
          exchange: p.exchange,
          side: p.quantity >= 0 ? 'LONG' : 'SHORT',
          quantity: absQty,
          avgEntryPrice: p.avgEntryPrice,
          currentPrice,
          marketValue,
          unrealizedPnl,
          unrealizedPnlPct,
          realizedPnl: p.realizedPnl,
        } satisfies PositionValuationDto;
      }),
    );

    let positionsValue = 0;
    let unrealizedPnl = 0;
    let unpricedCount = 0;
    for (const v of valued) {
      if (v.marketValue !== null) positionsValue += v.marketValue;
      else unpricedCount += 1;
      if (v.unrealizedPnl !== null) unrealizedPnl += v.unrealizedPnl;
    }

    const equity = account.cashBalance + positionsValue;
    const p = account.toPersistenceProps();
    const summary: PaperAccountSummaryDto = {
      cashBalance: account.cashBalance,
      positionsValue,
      equity,
      unrealizedPnl,
      realizedPnl: account.realizedPnl,
      totalReturn: equity - p.startingCapital,
      totalReturnPct:
        p.startingCapital !== 0 ? ((equity - p.startingCapital) / p.startingCapital) * 100 : 0,
      unpricedCount,
    };

    return { ...toPaperAccountDto(account, positions.length), positions: valued, summary };
  }
}

export class ListPaperOrdersQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly accountId: string,
    readonly page: PageRequest,
    readonly openOnly: boolean,
  ) {}
}

export class ListPaperOrdersHandler
  implements IQueryHandler<ListPaperOrdersQuery, Page<OrderRecord>>
{
  constructor(private readonly repo: IPaperRepository) {}
  async execute(query: ListPaperOrdersQuery): Promise<Page<OrderRecord>> {
    await assertOwned(this.repo, query.accountId, query.userId);
    return this.repo.listOrders(query.accountId, query.page, query.openOnly);
  }
}

export class ListPaperTradesQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly accountId: string,
    readonly page: PageRequest,
  ) {}
}

export class ListPaperTradesHandler
  implements IQueryHandler<ListPaperTradesQuery, Page<TradeRecord>>
{
  constructor(private readonly repo: IPaperRepository) {}
  async execute(query: ListPaperTradesQuery): Promise<Page<TradeRecord>> {
    await assertOwned(this.repo, query.accountId, query.userId);
    return this.repo.listTrades(query.accountId, query.page);
  }
}
