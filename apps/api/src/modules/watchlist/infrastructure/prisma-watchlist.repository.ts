import type { PrismaClient, Watchlist as PrismaWatchlist } from '@prisma/client';
import { UniqueEntityID } from '../../../shared/domain';
import { Watchlist } from '../domain/watchlist.entity';
import type {
  IWatchlistRepository,
  WatchlistItemRecord,
  WatchlistWithCount,
} from '../domain/watchlist.repository';

function toDomain(row: PrismaWatchlist): Watchlist {
  return Watchlist.reconstitute(
    {
      userId: row.userId,
      name: row.name,
      color: row.color,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    new UniqueEntityID(row.id),
  );
}

export class PrismaWatchlistRepository implements IWatchlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(watchlist: Watchlist): Promise<void> {
    const p = watchlist.toPersistenceProps();
    await this.prisma.watchlist.create({
      data: {
        id: watchlist.id.toString(),
        userId: p.userId,
        name: p.name,
        color: p.color,
        isDefault: p.isDefault,
        sortOrder: p.sortOrder,
      },
    });
  }

  async save(watchlist: Watchlist): Promise<void> {
    const p = watchlist.toPersistenceProps();
    await this.prisma.watchlist.update({
      where: { id: watchlist.id.toString() },
      data: { name: p.name, color: p.color, isDefault: p.isDefault, sortOrder: p.sortOrder },
    });
  }

  async findById(id: string): Promise<Watchlist | null> {
    const row = await this.prisma.watchlist.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByUser(userId: string): Promise<WatchlistWithCount[]> {
    const rows = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { items: true } } },
    });
    return rows.map((row) => ({ watchlist: toDomain(row), itemCount: row._count.items }));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.watchlist.delete({ where: { id } });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.watchlist.count({ where: { userId } });
  }

  async nameExists(userId: string, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.watchlist.count({
      where: { userId, name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return count > 0;
  }

  async listItems(watchlistId: string): Promise<WatchlistItemRecord[]> {
    const rows = await this.prisma.watchlistItem.findMany({
      where: { watchlistId },
      orderBy: [{ sortOrder: 'asc' }, { addedAt: 'asc' }],
      include: { instrument: { include: { exchange: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      instrumentId: r.instrumentId,
      note: r.note,
      sortOrder: r.sortOrder,
      symbol: r.instrument.symbol,
      name: r.instrument.name,
      assetClass: r.instrument.assetClass,
      exchange: r.instrument.exchange.code,
    }));
  }

  async itemExists(watchlistId: string, instrumentId: string): Promise<boolean> {
    const count = await this.prisma.watchlistItem.count({ where: { watchlistId, instrumentId } });
    return count > 0;
  }

  async countItems(watchlistId: string): Promise<number> {
    return this.prisma.watchlistItem.count({ where: { watchlistId } });
  }

  async addItem(watchlistId: string, instrumentId: string, note: string | null): Promise<void> {
    const max = await this.prisma.watchlistItem.aggregate({
      where: { watchlistId },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;
    await this.prisma.watchlistItem.create({
      data: { watchlistId, instrumentId, note, sortOrder },
    });
  }

  async removeItem(watchlistId: string, instrumentId: string): Promise<void> {
    await this.prisma.watchlistItem.deleteMany({ where: { watchlistId, instrumentId } });
  }

  async reorderItems(watchlistId: string, orderedInstrumentIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedInstrumentIds.map((instrumentId, index) =>
        this.prisma.watchlistItem.updateMany({
          where: { watchlistId, instrumentId },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
