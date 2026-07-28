import type { PrismaClient, Portfolio as PrismaPortfolio } from '@prisma/client';
import {
  buildPage,
  normalizePageRequest,
  UniqueEntityID,
  type Page,
  type PageRequest,
} from '../../../shared/domain';
import { Portfolio } from '../domain/portfolio.entity';
import type { HoldingState, PortfolioTxType } from '../domain/position-math';
import type {
  HoldingRecord,
  IPortfolioRepository,
  PortfolioWithCounts,
  RecordTransactionInput,
  TransactionRecord,
} from '../domain/portfolio.repository';

function toDomain(row: PrismaPortfolio): Portfolio {
  return Portfolio.reconstitute(
    {
      userId: row.userId,
      name: row.name,
      baseCurrency: row.baseCurrency,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    new UniqueEntityID(row.id),
  );
}

export class PrismaPortfolioRepository implements IPortfolioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(portfolio: Portfolio): Promise<void> {
    const p = portfolio.toPersistenceProps();
    await this.prisma.portfolio.create({
      data: {
        id: portfolio.id.toString(),
        userId: p.userId,
        name: p.name,
        baseCurrency: p.baseCurrency,
        isDefault: p.isDefault,
      },
    });
  }

  async save(portfolio: Portfolio): Promise<void> {
    const p = portfolio.toPersistenceProps();
    await this.prisma.portfolio.update({
      where: { id: portfolio.id.toString() },
      data: { name: p.name, baseCurrency: p.baseCurrency, isDefault: p.isDefault },
    });
  }

  async findById(id: string): Promise<Portfolio | null> {
    const row = await this.prisma.portfolio.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByUser(userId: string): Promise<PortfolioWithCounts[]> {
    const rows = await this.prisma.portfolio.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { _count: { select: { holdings: true } } },
    });
    return rows.map((row) => ({ portfolio: toDomain(row), holdingCount: row._count.holdings }));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.portfolio.delete({ where: { id } });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.portfolio.count({ where: { userId } });
  }

  async nameExists(userId: string, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.portfolio.count({
      where: { userId, name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return count > 0;
  }

  async getHolding(portfolioId: string, instrumentId: string): Promise<HoldingState | null> {
    const row = await this.prisma.holding.findUnique({
      where: { portfolioId_instrumentId: { portfolioId, instrumentId } },
    });
    return row
      ? { quantity: Number(row.quantity), avgCost: Number(row.avgCost), realizedPnl: Number(row.realizedPnl) }
      : null;
  }

  async listHoldings(portfolioId: string): Promise<HoldingRecord[]> {
    const rows = await this.prisma.holding.findMany({
      where: { portfolioId },
      include: { instrument: { include: { exchange: true } } },
      orderBy: { openedAt: 'asc' },
    });
    return rows.map((r) => ({
      instrumentId: r.instrumentId,
      symbol: r.instrument.symbol,
      name: r.instrument.name,
      assetClass: r.instrument.assetClass,
      exchange: r.instrument.exchange.code,
      quantity: Number(r.quantity),
      avgCost: Number(r.avgCost),
      realizedPnl: Number(r.realizedPnl),
    }));
  }

  async listTransactions(portfolioId: string, page: PageRequest): Promise<Page<TransactionRecord>> {
    const req = normalizePageRequest(page);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.portfolioTransaction.findMany({
        where: { portfolioId },
        include: { instrument: true },
        orderBy: { executedAt: 'desc' },
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.portfolioTransaction.count({ where: { portfolioId } }),
    ]);
    const items: TransactionRecord[] = rows.map((r) => ({
      id: r.id,
      instrumentId: r.instrumentId,
      symbol: r.instrument?.symbol ?? null,
      type: r.type,
      quantity: r.quantity !== null ? Number(r.quantity) : null,
      price: r.price !== null ? Number(r.price) : null,
      amount: Number(r.amount),
      fees: Number(r.fees),
      note: r.note,
      executedAt: r.executedAt.toISOString(),
    }));
    return buildPage(items, total, req);
  }

  async recordTransaction(input: RecordTransactionInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.portfolioTransaction.create({
        data: {
          portfolioId: input.portfolioId,
          instrumentId: input.instrumentId,
          type: input.type as PortfolioTxType,
          quantity: input.quantity,
          price: input.price,
          amount: input.amount,
          fees: input.fees,
          currency: input.currency,
          note: input.note,
          executedAt: input.executedAt,
        },
      });
      await tx.holding.upsert({
        where: { portfolioId_instrumentId: { portfolioId: input.portfolioId, instrumentId: input.instrumentId } },
        create: {
          portfolioId: input.portfolioId,
          instrumentId: input.instrumentId,
          quantity: input.nextHolding.quantity,
          avgCost: input.nextHolding.avgCost,
          realizedPnl: input.nextHolding.realizedPnl,
        },
        update: {
          quantity: input.nextHolding.quantity,
          avgCost: input.nextHolding.avgCost,
          realizedPnl: input.nextHolding.realizedPnl,
        },
      });
    });
  }
}
