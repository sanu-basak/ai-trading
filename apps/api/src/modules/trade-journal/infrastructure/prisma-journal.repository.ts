import { Prisma, type PrismaClient } from '@prisma/client';
import { buildPage, normalizePageRequest, UniqueEntityID, type Page } from '../../../shared/domain';
import { JournalTrade, type TradeSide, type TradeStatus } from '../domain/journal-trade.entity';
import type { StatTrade } from '../domain/journal-math';
import type {
  IJournalRepository,
  JournalListFilter,
  JournalTradeView,
} from '../domain/journal.repository';

type Row = Prisma.JournalTradeGetPayload<{
  include: { instrument: { include: { exchange: true } } };
}>;

const INCLUDE = { instrument: { include: { exchange: true } } } satisfies Prisma.JournalTradeInclude;

const num = (d: Prisma.Decimal | null): number | null => (d === null ? null : Number(d));

function toView(r: Row): JournalTradeView {
  return {
    id: r.id,
    instrumentId: r.instrumentId,
    symbol: r.instrument.symbol,
    name: r.instrument.name,
    exchange: r.instrument.exchange.code,
    side: r.side,
    status: r.status,
    quantity: Number(r.quantity),
    entryPrice: Number(r.entryPrice),
    exitPrice: num(r.exitPrice),
    stopLoss: num(r.stopLoss),
    target: num(r.target),
    entryAt: r.entryAt.toISOString(),
    exitAt: r.exitAt ? r.exitAt.toISOString() : null,
    fees: Number(r.fees),
    pnl: num(r.pnl),
    pnlPct: num(r.pnlPct),
    rMultiple: num(r.rMultiple),
    setup: r.setup,
    timeframe: r.timeframe,
    emotionBefore: r.emotionBefore,
    emotionAfter: r.emotionAfter,
    mistakes: r.mistakes,
    lessons: r.lessons,
    notes: r.notes,
    ratingExecution: r.ratingExecution,
    createdAt: r.createdAt.toISOString(),
  };
}

function toDomain(r: Row): JournalTrade {
  return JournalTrade.reconstitute(
    {
      userId: r.userId,
      instrumentId: r.instrumentId,
      side: r.side as TradeSide,
      status: r.status as TradeStatus,
      quantity: Number(r.quantity),
      entryPrice: Number(r.entryPrice),
      exitPrice: num(r.exitPrice),
      stopLoss: num(r.stopLoss),
      target: num(r.target),
      entryAt: r.entryAt,
      exitAt: r.exitAt,
      fees: Number(r.fees),
      pnl: num(r.pnl),
      pnlPct: num(r.pnlPct),
      rMultiple: num(r.rMultiple),
      setup: r.setup,
      timeframe: r.timeframe,
      emotionBefore: r.emotionBefore,
      emotionAfter: r.emotionAfter,
      mistakes: r.mistakes,
      lessons: r.lessons,
      notes: r.notes,
      ratingExecution: r.ratingExecution,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    },
    new UniqueEntityID(r.id),
  );
}

export class PrismaJournalRepository implements IJournalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(trade: JournalTrade): Promise<void> {
    const p = trade.toPersistenceProps();
    await this.prisma.journalTrade.create({
      data: {
        id: trade.id.toString(),
        userId: p.userId,
        instrumentId: p.instrumentId,
        side: p.side as Prisma.JournalTradeUncheckedCreateInput['side'],
        status: p.status as Prisma.JournalTradeUncheckedCreateInput['status'],
        quantity: p.quantity,
        entryPrice: p.entryPrice,
        exitPrice: p.exitPrice,
        stopLoss: p.stopLoss,
        target: p.target,
        entryAt: p.entryAt,
        exitAt: p.exitAt,
        fees: p.fees,
        pnl: p.pnl,
        pnlPct: p.pnlPct,
        rMultiple: p.rMultiple,
        setup: p.setup,
        timeframe: p.timeframe as Prisma.JournalTradeUncheckedCreateInput['timeframe'],
        emotionBefore: p.emotionBefore,
        notes: p.notes,
      },
    });
  }

  async save(trade: JournalTrade): Promise<void> {
    const p = trade.toPersistenceProps();
    await this.prisma.journalTrade.update({
      where: { id: trade.id.toString() },
      data: {
        status: p.status as Prisma.JournalTradeUncheckedUpdateInput['status'],
        exitPrice: p.exitPrice,
        exitAt: p.exitAt,
        fees: p.fees,
        pnl: p.pnl,
        pnlPct: p.pnlPct,
        rMultiple: p.rMultiple,
        setup: p.setup,
        emotionBefore: p.emotionBefore,
        emotionAfter: p.emotionAfter,
        mistakes: p.mistakes,
        lessons: p.lessons,
        notes: p.notes,
        ratingExecution: p.ratingExecution,
      },
    });
  }

  async findById(id: string): Promise<JournalTrade | null> {
    const row = await this.prisma.journalTrade.findUnique({ where: { id }, include: INCLUDE });
    return row ? toDomain(row) : null;
  }

  async view(id: string, userId: string): Promise<JournalTradeView | null> {
    const row = await this.prisma.journalTrade.findFirst({
      where: { id, userId },
      include: INCLUDE,
    });
    return row ? toView(row) : null;
  }

  async list(userId: string, filter: JournalListFilter): Promise<Page<JournalTradeView>> {
    const req = normalizePageRequest(filter);
    const where: Prisma.JournalTradeWhereInput = { userId };
    if (filter.status) where.status = filter.status as Prisma.JournalTradeWhereInput['status'];
    if (filter.instrumentId) where.instrumentId = filter.instrumentId;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.journalTrade.findMany({
        where,
        include: INCLUDE,
        orderBy: { entryAt: 'desc' },
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.journalTrade.count({ where }),
    ]);
    return buildPage(rows.map(toView), total, req);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.journalTrade.delete({ where: { id } });
  }

  async closedStats(userId: string, instrumentId?: string): Promise<StatTrade[]> {
    const rows = await this.prisma.journalTrade.findMany({
      where: { userId, status: 'CLOSED', ...(instrumentId ? { instrumentId } : {}) },
      select: { pnl: true, rMultiple: true },
    });
    return rows.map((r) => ({
      pnl: r.pnl !== null ? Number(r.pnl) : 0,
      rMultiple: r.rMultiple !== null ? Number(r.rMultiple) : null,
    }));
  }
}
