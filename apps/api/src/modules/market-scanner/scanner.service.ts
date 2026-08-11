import { NotFoundError } from '../../shared/errors';
import type { Logger } from '../../shared/infrastructure/logger';
import type { MarketDataService, AssetClass as MdAssetClass, Timeframe } from '../../market-data';
import type { AiEngineClient } from '../ai-analysis';
import { TIMEFRAME_MS } from '../ai-analysis/application/dto';
import type { IWatchlistRepository } from '../watchlist/domain/watchlist.repository';

const MAX_SCAN = 25;
const LOOKBACK = 200;
const MIN_CANDLES = 30;

export interface ScanRow {
  instrumentId: string;
  symbol: string;
  exchange: string;
  signal: string;
  confidence: number;
  trend: string;
  price: number | null;
}

export interface ScanResult {
  scanned: number;
  matched: number;
  timeframe: string;
  results: ScanRow[];
  disclaimer: string;
}

const DISCLAIMER =
  'Screening output for research only — not investment advice, and no outcome is guaranteed.';

/**
 * Runs the AI signal engine across a watchlist's instruments and ranks the
 * results by confidence. Bounded to a sane number of instruments per scan; each
 * uses real candles (unpriceable instruments are skipped, never faked).
 */
export class ScannerService {
  constructor(
    private readonly watchlistRepo: IWatchlistRepository,
    private readonly marketData: MarketDataService,
    private readonly aiClient: AiEngineClient,
    private readonly logger: Logger,
  ) {}

  async scanWatchlist(
    userId: string,
    watchlistId: string,
    timeframe: Timeframe,
    signalFilter?: string,
  ): Promise<ScanResult> {
    const watchlist = await this.watchlistRepo.findById(watchlistId);
    if (!watchlist || !watchlist.isOwnedBy(userId)) throw new NotFoundError('Watchlist');

    const items = (await this.watchlistRepo.listItems(watchlistId)).slice(0, MAX_SCAN);
    const tfMs = TIMEFRAME_MS[timeframe] ?? TIMEFRAME_MS['1d']!;

    const rows = await Promise.all(
      items.map(async (item): Promise<ScanRow | null> => {
        try {
          const to = Date.now();
          const candleResponse = await this.marketData.getCandles({
            symbol: { symbol: item.symbol, exchange: item.exchange, assetClass: item.assetClass as MdAssetClass },
            timeframe,
            from: to - LOOKBACK * tfMs,
            to,
            limit: LOOKBACK,
          });
          if (candleResponse.candles.length < MIN_CANDLES) return null;

          const a = await this.aiClient.analyze({
            symbol: item.symbol,
            exchange: item.exchange,
            timeframe,
            candles: candleResponse.candles.map((c) => ({
              openTime: c.openTime,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            })),
          });
          const price = a.indicators['price'];
          return {
            instrumentId: item.instrumentId,
            symbol: item.symbol,
            exchange: item.exchange,
            signal: a.signal,
            confidence: a.confidence,
            trend: a.trend,
            price: typeof price === 'number' ? price : null,
          };
        } catch (err) {
          this.logger.debug({ err, symbol: item.symbol }, 'Scan skipped instrument');
          return null;
        }
      }),
    );

    const priced = rows.filter((r): r is ScanRow => r !== null);
    const matched = (signalFilter ? priced.filter((r) => r.signal === signalFilter) : priced).sort(
      (a, b) => b.confidence - a.confidence,
    );

    return {
      scanned: items.length,
      matched: matched.length,
      timeframe,
      results: matched,
      disclaimer: DISCLAIMER,
    };
  }
}
