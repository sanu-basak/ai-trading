import type { ICommand, ICommandHandler } from '../../../shared/application';
import { DomainError, InternalError, NotFoundError } from '../../../shared/errors';
import type { Logger } from '../../../shared/infrastructure/logger';
import { WS_EVENTS, type SocketServer } from '../../../shared/infrastructure/websocket';
import type { MarketDataService, AssetClass as MdAssetClass, Timeframe } from '../../../market-data';
import type { IInstrumentReadRepository } from '../../instruments';
import type { AiEngineClient } from '../infrastructure/ai-engine.client';
import type { ISignalRepository } from '../domain/signal.repository';
import { PRISMA_TIMEFRAME, TIMEFRAME_MS, withDisclaimer, type SignalDto } from './dto';

const CANDLE_LOOKBACK = 300;
const MIN_CANDLES = 30;

export class AnalyzeInstrumentCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly instrumentId: string,
    readonly timeframe: Timeframe,
  ) {}
}

/**
 * End-to-end analysis: fetches real candles via the market-data layer, sends
 * them to the Python AI engine, persists the explainable signal, pushes it to
 * the user over WebSocket, and returns it. No prices are ever synthesized — if
 * the market data is unavailable the request fails rather than inventing data.
 */
export class AnalyzeInstrumentHandler
  implements ICommandHandler<AnalyzeInstrumentCommand, SignalDto>
{
  constructor(
    private readonly instrumentRepo: IInstrumentReadRepository,
    private readonly marketData: MarketDataService,
    private readonly aiClient: AiEngineClient,
    private readonly signalRepo: ISignalRepository,
    private readonly socketServer: SocketServer,
    private readonly logger: Logger,
  ) {}

  async execute(command: AnalyzeInstrumentCommand): Promise<SignalDto> {
    const instrument = await this.instrumentRepo.findById(command.instrumentId);
    if (!instrument) throw new NotFoundError('Instrument');

    const to = Date.now();
    const from = to - CANDLE_LOOKBACK * (TIMEFRAME_MS[command.timeframe] ?? TIMEFRAME_MS['1d']!);

    const candleResponse = await this.marketData.getCandles({
      symbol: {
        symbol: instrument.symbol,
        exchange: instrument.exchange.code,
        assetClass: instrument.assetClass as MdAssetClass,
      },
      timeframe: command.timeframe,
      from,
      to,
      limit: CANDLE_LOOKBACK,
    });

    if (candleResponse.candles.length < MIN_CANDLES) {
      throw new DomainError(
        `Not enough historical data to analyze (${candleResponse.candles.length} candles).`,
      );
    }

    const analysis = await this.aiClient.analyze({
      symbol: instrument.symbol,
      exchange: instrument.exchange.code,
      timeframe: command.timeframe,
      candles: candleResponse.candles.map((c) => ({
        openTime: c.openTime,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
    });

    const prismaTimeframe = PRISMA_TIMEFRAME[command.timeframe];
    if (!prismaTimeframe) {
      throw new InternalError(`Unsupported timeframe mapping: ${command.timeframe}`);
    }

    // Map the engine's pattern direction (bullish/bearish/neutral) to the
    // TrendDirection enum used for persistence.
    const directionToTrend = (d: string): string | null =>
      d === 'bullish' ? 'UP' : d === 'bearish' ? 'DOWN' : null;

    const signalId = await this.signalRepo.create({
      userId: command.userId,
      instrumentId: instrument.id,
      type: analysis.signal,
      timeframe: prismaTimeframe,
      confidence: analysis.confidence,
      entry: analysis.entry,
      stopLoss: analysis.stop_loss,
      targets: analysis.targets,
      riskReward: analysis.risk_reward,
      holdingPeriod: analysis.holding_period,
      marketRegime: analysis.market_regime,
      trend: analysis.trend,
      reasons: analysis.reasons,
      indicators: analysis.indicators,
      rejection: analysis.rejection,
      summary: analysis.summary,
      modelVersion: analysis.model_version,
      expiresAt: null,
      patterns: analysis.patterns.map((p) => ({
        name: p.name,
        category: p.category,
        direction: directionToTrend(p.direction),
        confidence: p.confidence,
        detail: p.detail,
      })),
      levels: analysis.levels.map((lv) => ({
        kind: lv.kind,
        price: lv.price,
        strength: lv.strength,
        label: `${lv.distance_pct >= 0 ? '+' : ''}${lv.distance_pct.toFixed(2)}%`,
      })),
    });

    const record = await this.signalRepo.findById(signalId, command.userId);
    if (!record) throw new InternalError('Signal persisted but could not be reloaded');

    this.socketServer.emitToUser(command.userId, WS_EVENTS.SIGNAL_CREATED, record);
    this.logger.info(
      { userId: command.userId, instrument: instrument.symbol, signal: analysis.signal },
      'AI signal generated',
    );

    return withDisclaimer(record);
  }
}
