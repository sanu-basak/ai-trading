import { WS_EVENTS, type SocketServer } from '../../../shared/infrastructure/websocket';
import type { Logger } from '../../../shared/infrastructure/logger';
import type { MarketDataService, AssetClass as MdAssetClass } from '../../../market-data';
import { MarketDataUnavailableError } from '../../../market-data';
import { describeCondition, evaluateCondition } from '../domain/alert-condition';
import type { EvaluableAlert, IAlertRepository } from '../domain/alert.repository';

const MAX_ALERTS_PER_RUN = 500;

/**
 * Evaluates active alerts against live market data. Quotes are fetched once per
 * symbol per run (cached), cooldowns are respected, and on a trigger it writes
 * the AlertTrigger + Notification atomically and pushes both over WebSocket.
 * Designed to be invoked on a schedule by the alert worker.
 */
export class AlertEvaluationService {
  constructor(
    private readonly alertRepo: IAlertRepository,
    private readonly marketData: MarketDataService,
    private readonly socketServer: SocketServer,
    private readonly logger: Logger,
  ) {}

  private inCooldown(alert: EvaluableAlert, now: Date): boolean {
    if (alert.cooldownSec <= 0 || alert.lastTriggeredAt === null) return false;
    return now.getTime() - alert.lastTriggeredAt.getTime() < alert.cooldownSec * 1000;
  }

  async evaluateAll(): Promise<{ evaluated: number; triggered: number }> {
    const alerts = await this.alertRepo.listEvaluable(MAX_ALERTS_PER_RUN);
    const now = new Date();
    const priceCache = new Map<string, number | null>();
    let triggered = 0;

    for (const alert of alerts) {
      if (this.inCooldown(alert, now)) continue;

      const key = `${alert.exchange}:${alert.symbol}`;
      let price = priceCache.get(key);
      if (price === undefined) {
        price = await this.fetchPrice(alert);
        priceCache.set(key, price);
      }
      if (price === null) continue;

      if (!evaluateCondition(alert.condition, { price })) continue;

      await this.fire(alert, price, now);
      triggered += 1;
    }

    if (triggered > 0) {
      this.logger.info({ evaluated: alerts.length, triggered }, 'Alerts triggered');
    }
    return { evaluated: alerts.length, triggered };
  }

  private async fetchPrice(alert: EvaluableAlert): Promise<number | null> {
    try {
      const quote = await this.marketData.getQuote({
        symbol: alert.symbol,
        exchange: alert.exchange,
        assetClass: alert.assetClass as MdAssetClass,
      });
      return quote.price;
    } catch (err) {
      if (!(err instanceof MarketDataUnavailableError)) {
        this.logger.warn({ err, symbol: alert.symbol }, 'Alert price fetch failed');
      }
      return null;
    }
  }

  private async fire(alert: EvaluableAlert, price: number, now: Date): Promise<void> {
    const description = describeCondition(alert.condition, alert.symbol);
    const title = `Alert triggered: ${alert.name}`;
    const body = `${description} — current price ${price}`;
    const data = { alertId: alert.id, instrumentId: alert.instrumentId, symbol: alert.symbol, price };

    const notificationId = await this.alertRepo.trigger({
      alertId: alert.id,
      userId: alert.userId,
      newStatus: alert.isRepeating ? 'ACTIVE' : 'TRIGGERED',
      lastTriggeredAt: now,
      payload: { price, condition: alert.condition },
      notification: { title, body, data },
    });

    this.socketServer.emitToUser(alert.userId, WS_EVENTS.ALERT_TRIGGERED, {
      alertId: alert.id,
      symbol: alert.symbol,
      price,
      description,
    });
    this.socketServer.emitToUser(alert.userId, WS_EVENTS.NOTIFICATION, {
      id: notificationId,
      title,
      body,
      category: 'ALERT',
      createdAt: now.toISOString(),
    });
  }
}
