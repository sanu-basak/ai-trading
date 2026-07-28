import { Prisma, type PrismaClient, type Instrument, type Exchange } from '@prisma/client';
import { buildPage, normalizePageRequest, type Page } from '../../../shared/domain';
import type {
  IInstrumentReadRepository,
  InstrumentSearchFilter,
} from '../domain/instrument.repository';
import type { ExchangeDto, InstrumentDto } from '../application/dto';

type InstrumentWithExchange = Instrument & { exchange: Exchange };

function toInstrumentDto(row: InstrumentWithExchange): InstrumentDto {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    assetClass: row.assetClass,
    exchange: { code: row.exchange.code, name: row.exchange.name },
    currency: row.currency,
    sector: row.sector,
    industry: row.industry,
    lotSize: row.lotSize,
    tickSize: Number(row.tickSize),
    isTradable: row.isTradable,
    isActive: row.isActive,
  };
}

export class PrismaInstrumentReadRepository implements IInstrumentReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async search(filter: InstrumentSearchFilter): Promise<Page<InstrumentDto>> {
    const req = normalizePageRequest(filter);
    const where: Prisma.InstrumentWhereInput = { isActive: true };
    if (filter.assetClass) {
      where.assetClass = filter.assetClass as Prisma.InstrumentWhereInput['assetClass'];
    }
    if (filter.exchangeCode) where.exchange = { code: filter.exchangeCode };
    if (filter.query) {
      where.OR = [
        { symbol: { contains: filter.query, mode: 'insensitive' } },
        { name: { contains: filter.query, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.instrument.findMany({
        where,
        include: { exchange: true },
        orderBy: [{ symbol: 'asc' }],
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.instrument.count({ where }),
    ]);

    return buildPage(rows.map(toInstrumentDto), total, req);
  }

  async findById(id: string): Promise<InstrumentDto | null> {
    const row = await this.prisma.instrument.findUnique({
      where: { id },
      include: { exchange: true },
    });
    return row ? toInstrumentDto(row) : null;
  }

  async findBySymbol(exchangeCode: string, symbol: string): Promise<InstrumentDto | null> {
    const row = await this.prisma.instrument.findFirst({
      where: { symbol, exchange: { code: exchangeCode } },
      include: { exchange: true },
    });
    return row ? toInstrumentDto(row) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.instrument.count({ where: { id } });
    return count > 0;
  }

  async listExchanges(): Promise<ExchangeDto[]> {
    const rows = await this.prisma.exchange.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return rows.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      country: e.country,
      currency: e.currency,
      timezone: e.timezone,
    }));
  }
}
