import { createId } from '@paralleldrive/cuid2';
import type { PrismaClient, PaperAccount as PrismaPaperAccount } from '@prisma/client';
import { buildPage, normalizePageRequest, UniqueEntityID, type Page, type PageRequest } from '../../../shared/domain';
import { PaperAccount } from '../domain/paper-account.entity';
import type { PositionState } from '../domain/fill-math';
import type {
  CreateOpenOrderInput,
  ExecuteFillInput,
  IPaperRepository,
  OrderRecord,
  PaperAccountWithCounts,
  PositionRecord,
  TradeRecord,
} from '../domain/paper.repository';

const EPS = 1e-9;

function toAccount(row: PrismaPaperAccount): PaperAccount {
  return PaperAccount.reconstitute(
    {
      userId: row.userId,
      name: row.name,
      currency: row.currency,
      startingCapital: Number(row.startingCapital),
      cashBalance: Number(row.cashBalance),
      realizedPnl: Number(row.realizedPnl),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    new UniqueEntityID(row.id),
  );
}

export class PrismaPaperRepository implements IPaperRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createAccount(account: PaperAccount): Promise<void> {
    const p = account.toPersistenceProps();
    await this.prisma.paperAccount.create({
      data: {
        id: account.id.toString(),
        userId: p.userId,
        name: p.name,
        currency: p.currency,
        startingCapital: p.startingCapital,
        cashBalance: p.cashBalance,
        equity: p.cashBalance,
        realizedPnl: p.realizedPnl,
        isActive: p.isActive,
      },
    });
  }

  async findAccountById(id: string): Promise<PaperAccount | null> {
    const row = await this.prisma.paperAccount.findUnique({ where: { id } });
    return row ? toAccount(row) : null;
  }

  async findAccountsByUser(userId: string): Promise<PaperAccountWithCounts[]> {
    const rows = await this.prisma.paperAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { positions: true } } },
    });
    return rows.map((r) => ({ account: toAccount(r), openPositions: r._count.positions }));
  }

  async countAccountsByUser(userId: string): Promise<number> {
    return this.prisma.paperAccount.count({ where: { userId } });
  }

  async deleteAccount(id: string): Promise<void> {
    await this.prisma.paperAccount.delete({ where: { id } });
  }

  async getPosition(accountId: string, instrumentId: string): Promise<PositionState | null> {
    const row = await this.prisma.paperPosition.findUnique({
      where: { accountId_instrumentId: { accountId, instrumentId } },
    });
    if (!row || row.status === 'CLOSED') return null;
    const qty = Number(row.quantity);
    return {
      quantity: row.side === 'SHORT' ? -qty : qty,
      avgEntryPrice: Number(row.avgEntryPrice),
    };
  }

  async listPositions(accountId: string): Promise<PositionRecord[]> {
    const rows = await this.prisma.paperPosition.findMany({
      where: { accountId, status: 'OPEN' },
      include: { instrument: { include: { exchange: true } } },
      orderBy: { openedAt: 'asc' },
    });
    return rows.map((r) => {
      const qty = Number(r.quantity);
      return {
        instrumentId: r.instrumentId,
        symbol: r.instrument.symbol,
        name: r.instrument.name,
        assetClass: r.instrument.assetClass,
        exchange: r.instrument.exchange.code,
        quantity: r.side === 'SHORT' ? -qty : qty,
        avgEntryPrice: Number(r.avgEntryPrice),
        realizedPnl: Number(r.realizedPnl),
      };
    });
  }

  async listOrders(accountId: string, page: PageRequest, openOnly = false): Promise<Page<OrderRecord>> {
    const req = normalizePageRequest(page);
    const where = { accountId, ...(openOnly ? { status: 'OPEN' as const } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.paperOrder.findMany({
        where,
        include: { instrument: true },
        orderBy: { placedAt: 'desc' },
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.paperOrder.count({ where }),
    ]);
    const items: OrderRecord[] = rows.map((r) => ({
      id: r.id,
      instrumentId: r.instrumentId,
      symbol: r.instrument.symbol,
      side: r.side,
      type: r.type,
      status: r.status,
      quantity: Number(r.quantity),
      filledQty: Number(r.filledQty),
      limitPrice: r.limitPrice !== null ? Number(r.limitPrice) : null,
      avgFillPrice: r.avgFillPrice !== null ? Number(r.avgFillPrice) : null,
      placedAt: r.placedAt.toISOString(),
    }));
    return buildPage(items, total, req);
  }

  async listTrades(accountId: string, page: PageRequest): Promise<Page<TradeRecord>> {
    const req = normalizePageRequest(page);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.paperTrade.findMany({
        where: { accountId },
        include: { instrument: true },
        orderBy: { executedAt: 'desc' },
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.paperTrade.count({ where: { accountId } }),
    ]);
    const items: TradeRecord[] = rows.map((r) => ({
      id: r.id,
      instrumentId: r.instrumentId,
      symbol: r.instrument.symbol,
      side: r.side,
      quantity: Number(r.quantity),
      price: Number(r.price),
      fees: Number(r.fees),
      pnl: r.pnl !== null ? Number(r.pnl) : null,
      executedAt: r.executedAt.toISOString(),
    }));
    return buildPage(items, total, req);
  }

  async findOrder(accountId: string, orderId: string): Promise<OrderRecord | null> {
    const r = await this.prisma.paperOrder.findFirst({
      where: { id: orderId, accountId },
      include: { instrument: true },
    });
    if (!r) return null;
    return {
      id: r.id,
      instrumentId: r.instrumentId,
      symbol: r.instrument.symbol,
      side: r.side,
      type: r.type,
      status: r.status,
      quantity: Number(r.quantity),
      filledQty: Number(r.filledQty),
      limitPrice: r.limitPrice !== null ? Number(r.limitPrice) : null,
      avgFillPrice: r.avgFillPrice !== null ? Number(r.avgFillPrice) : null,
      placedAt: r.placedAt.toISOString(),
    };
  }

  async cancelOrder(accountId: string, orderId: string): Promise<boolean> {
    const result = await this.prisma.paperOrder.updateMany({
      where: { id: orderId, accountId, status: { in: ['OPEN', 'PENDING', 'PARTIALLY_FILLED'] } },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    return result.count > 0;
  }

  async executeFill(input: ExecuteFillInput): Promise<{ orderId: string; tradeId: string }> {
    const orderId = createId();
    const tradeId = createId();
    const now = new Date();
    const absQty = Math.abs(input.newPosition.quantity);
    const closed = absQty < EPS;
    const ledgerAmount =
      (input.side === 'BUY' ? -1 : 1) * input.quantity * input.fillPrice - input.fees;

    await this.prisma.$transaction(async (tx) => {
      await tx.paperOrder.create({
        data: {
          id: orderId,
          accountId: input.accountId,
          instrumentId: input.instrumentId,
          side: input.side,
          type: input.orderType,
          status: 'FILLED',
          quantity: input.quantity,
          filledQty: input.quantity,
          limitPrice: input.limitPrice,
          avgFillPrice: input.fillPrice,
          filledAt: now,
        },
      });

      await tx.paperTrade.create({
        data: {
          id: tradeId,
          accountId: input.accountId,
          orderId,
          instrumentId: input.instrumentId,
          side: input.side,
          quantity: input.quantity,
          price: input.fillPrice,
          fees: input.fees,
          pnl: input.realizedPnl,
          executedAt: now,
        },
      });

      await tx.paperPosition.upsert({
        where: { accountId_instrumentId: { accountId: input.accountId, instrumentId: input.instrumentId } },
        create: {
          accountId: input.accountId,
          instrumentId: input.instrumentId,
          side: input.newPosition.quantity >= 0 ? 'LONG' : 'SHORT',
          status: closed ? 'CLOSED' : 'OPEN',
          quantity: absQty,
          avgEntryPrice: input.newPosition.avgEntryPrice,
          realizedPnl: input.realizedPnl,
          closedAt: closed ? now : null,
        },
        update: {
          side: input.newPosition.quantity >= 0 ? 'LONG' : 'SHORT',
          status: closed ? 'CLOSED' : 'OPEN',
          quantity: absQty,
          avgEntryPrice: input.newPosition.avgEntryPrice,
          realizedPnl: { increment: input.realizedPnl },
          closedAt: closed ? now : null,
        },
      });

      await tx.paperAccount.update({
        where: { id: input.accountId },
        data: {
          cashBalance: input.newCashBalance,
          equity: input.newCashBalance,
          realizedPnl: { increment: input.realizedPnl },
        },
      });

      await tx.paperTransaction.create({
        data: {
          accountId: input.accountId,
          type: input.side,
          amount: ledgerAmount,
          balance: input.newCashBalance,
          note: `${input.side} ${input.quantity} @ ${input.fillPrice}`,
        },
      });
    });

    return { orderId, tradeId };
  }

  async createOpenOrder(input: CreateOpenOrderInput): Promise<{ orderId: string }> {
    const order = await this.prisma.paperOrder.create({
      data: {
        accountId: input.accountId,
        instrumentId: input.instrumentId,
        side: input.side,
        type: 'LIMIT',
        status: 'OPEN',
        quantity: input.quantity,
        limitPrice: input.limitPrice,
      },
    });
    return { orderId: order.id };
  }
}
