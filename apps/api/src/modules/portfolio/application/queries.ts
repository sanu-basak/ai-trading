import type { IQuery, IQueryHandler } from '../../../shared/application';
import type { Page, PageRequest } from '../../../shared/domain';
import { NotFoundError } from '../../../shared/errors';
import type { Logger } from '../../../shared/infrastructure/logger';
import type { MarketDataService, AssetClass as MdAssetClass } from '../../../market-data';
import type { IPortfolioRepository, TransactionRecord } from '../domain/portfolio.repository';
import {
  toPortfolioDto,
  type HoldingValuationDto,
  type PortfolioDetailDto,
  type PortfolioDto,
  type PortfolioSummaryDto,
} from './dto';

export class ListPortfoliosQuery implements IQuery {
  constructor(readonly userId: string) {}
}

export class ListPortfoliosHandler implements IQueryHandler<ListPortfoliosQuery, PortfolioDto[]> {
  constructor(private readonly repo: IPortfolioRepository) {}
  async execute(query: ListPortfoliosQuery): Promise<PortfolioDto[]> {
    const rows = await this.repo.findByUser(query.userId);
    return rows.map((r) => toPortfolioDto(r.portfolio, r.holdingCount));
  }
}

export class ListPortfolioTransactionsQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly portfolioId: string,
    readonly page: PageRequest,
  ) {}
}

export class ListPortfolioTransactionsHandler
  implements IQueryHandler<ListPortfolioTransactionsQuery, Page<TransactionRecord>>
{
  constructor(private readonly repo: IPortfolioRepository) {}
  async execute(query: ListPortfolioTransactionsQuery): Promise<Page<TransactionRecord>> {
    const portfolio = await this.repo.findById(query.portfolioId);
    if (!portfolio || !portfolio.isOwnedBy(query.userId)) throw new NotFoundError('Portfolio');
    return this.repo.listTransactions(query.portfolioId, query.page);
  }
}

export class GetPortfolioQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

/**
 * Returns a portfolio with each holding valued at the current market price.
 * Prices come from the live MarketDataService; instruments that cannot be
 * priced right now are surfaced as `currentPrice: null` — never estimated.
 */
export class GetPortfolioHandler implements IQueryHandler<GetPortfolioQuery, PortfolioDetailDto> {
  constructor(
    private readonly repo: IPortfolioRepository,
    private readonly marketData: MarketDataService,
    private readonly logger: Logger,
  ) {}

  async execute(query: GetPortfolioQuery): Promise<PortfolioDetailDto> {
    const portfolio = await this.repo.findById(query.id);
    if (!portfolio || !portfolio.isOwnedBy(query.userId)) throw new NotFoundError('Portfolio');

    const holdings = await this.repo.listHoldings(query.id);

    const valued: HoldingValuationDto[] = await Promise.all(
      holdings.map(async (h) => {
        const invested = h.quantity * h.avgCost;
        let currentPrice: number | null = null;
        let marketValue: number | null = null;
        let unrealizedPnl: number | null = null;
        let unrealizedPnlPct: number | null = null;
        try {
          const quote = await this.marketData.getQuote({
            symbol: h.symbol,
            exchange: h.exchange,
            assetClass: h.assetClass as MdAssetClass,
          });
          currentPrice = quote.price;
          marketValue = h.quantity * quote.price;
          unrealizedPnl = (quote.price - h.avgCost) * h.quantity;
          unrealizedPnlPct = invested !== 0 ? (unrealizedPnl / Math.abs(invested)) * 100 : null;
        } catch (err) {
          this.logger.debug({ err, symbol: h.symbol }, 'Holding could not be priced');
        }
        return {
          instrumentId: h.instrumentId,
          symbol: h.symbol,
          name: h.name,
          assetClass: h.assetClass,
          exchange: h.exchange,
          quantity: h.quantity,
          avgCost: h.avgCost,
          invested,
          currentPrice,
          marketValue,
          unrealizedPnl,
          unrealizedPnlPct,
          realizedPnl: h.realizedPnl,
        } satisfies HoldingValuationDto;
      }),
    );

    const summary = valued.reduce<PortfolioSummaryDto>(
      (acc, h) => {
        if (h.quantity > 0) acc.totalInvested += h.invested;
        if (h.marketValue !== null) acc.marketValue += h.marketValue;
        else if (h.quantity > 0) acc.unpricedCount += 1;
        if (h.unrealizedPnl !== null) acc.unrealizedPnl += h.unrealizedPnl;
        acc.realizedPnl += h.realizedPnl;
        return acc;
      },
      { totalInvested: 0, marketValue: 0, unrealizedPnl: 0, realizedPnl: 0, totalPnl: 0, unpricedCount: 0 },
    );
    summary.totalPnl = summary.unrealizedPnl + summary.realizedPnl;

    return { ...toPortfolioDto(portfolio, holdings.length), holdings: valued, summary };
  }
}
