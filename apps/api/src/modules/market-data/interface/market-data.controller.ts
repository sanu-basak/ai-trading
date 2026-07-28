import type { Request, Response } from 'express';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { sendOk } from '../../../http/response';
import type {
  MarketDataService,
  SymbolRef,
  Timeframe,
  AssetClass as MdAssetClass,
} from '../../../market-data';
import type { IInstrumentReadRepository } from '../../instruments';
import { toSymbolRef } from '../../instruments';

interface SymbolQuery {
  instrumentId?: string;
  exchange?: string;
  symbol?: string;
  assetClass?: string;
}

const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
  '1M': 2_592_000_000,
};

/**
 * Read boundary for market data. Resolves the request to a provider-agnostic
 * SymbolRef and delegates to the failover MarketDataService, which handles
 * caching, rate limiting and provider failover. Never returns synthetic data.
 */
export class MarketDataController {
  constructor(
    private readonly marketData: MarketDataService,
    private readonly instrumentRepo: IInstrumentReadRepository,
  ) {}

  private async resolveSymbol(q: SymbolQuery): Promise<SymbolRef> {
    if (q.instrumentId) {
      const instrument = await this.instrumentRepo.findById(q.instrumentId);
      if (!instrument) throw new NotFoundError('Instrument');
      return toSymbolRef(instrument);
    }
    if (q.exchange && q.symbol && q.assetClass) {
      return {
        symbol: q.symbol,
        exchange: q.exchange,
        assetClass: q.assetClass as MdAssetClass,
      };
    }
    throw new BadRequestError('Provide instrumentId or exchange + symbol + assetClass');
  }

  getQuote = async (req: Request, res: Response): Promise<void> => {
    const symbol = await this.resolveSymbol(req.query as SymbolQuery);
    const quote = await this.marketData.getQuote(symbol);
    sendOk(res, quote);
  };

  getCandles = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as SymbolQuery & {
      timeframe: Timeframe;
      from?: number;
      to?: number;
      limit?: number;
    };
    const symbol = await this.resolveSymbol(q);
    const limit = q.limit ?? 500;
    const to = q.to ?? Date.now();
    const from = q.from ?? to - limit * TIMEFRAME_MS[q.timeframe];
    const candles = await this.marketData.getCandles({
      symbol,
      timeframe: q.timeframe,
      from,
      to,
      limit,
    });
    sendOk(res, candles);
  };

  getOptionChain = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as SymbolQuery & { expiry: number };
    const symbol = await this.resolveSymbol(q);
    const chain = await this.marketData.getOptionChain(symbol, q.expiry);
    sendOk(res, chain);
  };
}
