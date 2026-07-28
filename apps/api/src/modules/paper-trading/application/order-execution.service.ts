import { DomainError, ServiceUnavailableError, ValidationError } from '../../../shared/errors';
import type { MarketDataService, AssetClass as MdAssetClass } from '../../../market-data';
import { MarketDataUnavailableError } from '../../../market-data';
import type { PaperAccount } from '../domain/paper-account.entity';
import { computeFill } from '../domain/fill-math';
import type { IPaperRepository } from '../domain/paper.repository';
import type { PlaceOrderResultDto } from './dto';

export interface OrderInstrument {
  id: string;
  symbol: string;
  exchange: string;
  assetClass: string;
}

export interface PlaceOrderRequest {
  account: PaperAccount;
  instrument: OrderInstrument;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  limitPrice?: number;
}

/**
 * The paper-trading matching engine. Orders are filled against the LIVE market
 * price from the MarketDataService — never a synthetic price. A MARKET order
 * fills immediately; a LIMIT order fills only if it is already marketable,
 * otherwise it is parked as an OPEN order (a future worker will match it when
 * the market crosses it). If no provider can price the instrument, the order is
 * rejected rather than filled at a guessed price.
 */
export class OrderExecutionService {
  private readonly fees = 0; // configurable commission model; zero for paper by default

  constructor(
    private readonly repo: IPaperRepository,
    private readonly marketData: MarketDataService,
  ) {}

  async place(request: PlaceOrderRequest): Promise<PlaceOrderResultDto> {
    const { account, instrument, side, type, quantity } = request;

    let referencePrice: number;
    try {
      const quote = await this.marketData.getQuote({
        symbol: instrument.symbol,
        exchange: instrument.exchange,
        assetClass: instrument.assetClass as MdAssetClass,
      });
      referencePrice = quote.price;
    } catch (err) {
      if (err instanceof MarketDataUnavailableError) {
        throw new ServiceUnavailableError(
          'No live price is available for this instrument, so the order cannot be simulated',
        );
      }
      throw err;
    }

    // Determine whether the order is immediately fillable.
    let willFill = type === 'MARKET';
    if (type === 'LIMIT') {
      if (request.limitPrice === undefined) {
        throw new ValidationError('limitPrice is required for LIMIT orders');
      }
      willFill =
        side === 'BUY' ? referencePrice <= request.limitPrice : referencePrice >= request.limitPrice;
    }

    if (!willFill) {
      const { orderId } = await this.repo.createOpenOrder({
        accountId: account.id.toString(),
        instrumentId: instrument.id,
        side,
        quantity,
        limitPrice: request.limitPrice as number,
      });
      return { status: 'OPEN', orderId, fillPrice: null, realizedPnl: null };
    }

    const fillPrice = referencePrice;
    const notional = quantity * fillPrice + this.fees;
    if (side === 'BUY' && !account.hasSufficientCash(notional)) {
      throw new DomainError('Insufficient cash for this order');
    }

    const current = await this.repo.getPosition(account.id.toString(), instrument.id);
    const fill = computeFill(current, { side, quantity, price: fillPrice, fees: this.fees });
    const newCashBalance = account.cashBalance + fill.cashDelta;

    const { orderId } = await this.repo.executeFill({
      accountId: account.id.toString(),
      instrumentId: instrument.id,
      side,
      orderType: type,
      quantity,
      limitPrice: request.limitPrice ?? null,
      fillPrice,
      fees: this.fees,
      realizedPnl: fill.realizedPnl,
      newPosition: fill.position,
      newCashBalance,
    });

    return { status: 'FILLED', orderId, fillPrice, realizedPnl: fill.realizedPnl };
  }
}
