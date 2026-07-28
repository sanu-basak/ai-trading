import { Prisma, type PrismaClient } from '@prisma/client';
import { buildPage, normalizePageRequest, type Page } from '../../../shared/domain';
import type {
  CreateSignalInput,
  ISignalRepository,
  SignalListFilter,
  SignalReasonJson,
  SignalRecord,
  SignalTargetJson,
} from '../domain/signal.repository';

type SignalRow = Prisma.SignalGetPayload<{
  include: { instrument: { include: { exchange: true } } };
}>;

function toRecord(row: SignalRow): SignalRecord {
  return {
    id: row.id,
    instrumentId: row.instrumentId,
    symbol: row.instrument.symbol,
    name: row.instrument.name,
    exchange: row.instrument.exchange.code,
    type: row.type,
    timeframe: row.timeframe,
    confidence: Number(row.confidence),
    entry: row.entry !== null ? Number(row.entry) : null,
    stopLoss: row.stopLoss !== null ? Number(row.stopLoss) : null,
    targets: (row.targets as unknown as SignalTargetJson[]) ?? [],
    riskReward: row.riskReward !== null ? Number(row.riskReward) : null,
    holdingPeriod: row.holdingPeriod,
    marketRegime: row.marketRegime,
    trend: row.trend,
    reasons: (row.reasons as unknown as SignalReasonJson[]) ?? [],
    indicators: (row.indicators as Record<string, unknown>) ?? {},
    rejection: (row.rejection as unknown as string[]) ?? [],
    summary: row.summary,
    modelVersion: row.modelVersion,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export class PrismaSignalRepository implements ISignalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSignalInput): Promise<string> {
    const signal = await this.prisma.signal.create({
      data: {
        userId: input.userId,
        instrumentId: input.instrumentId,
        type: input.type,
        timeframe: input.timeframe as Prisma.SignalCreateInput['timeframe'],
        confidence: input.confidence,
        entry: input.entry,
        stopLoss: input.stopLoss,
        targets: input.targets as unknown as Prisma.InputJsonValue,
        riskReward: input.riskReward,
        holdingPeriod: input.holdingPeriod,
        marketRegime: input.marketRegime
          ? (input.marketRegime as Prisma.SignalCreateInput['marketRegime'])
          : null,
        trend: input.trend ? (input.trend as Prisma.SignalCreateInput['trend']) : null,
        reasons: input.reasons as unknown as Prisma.InputJsonValue,
        indicators: input.indicators as Prisma.InputJsonValue,
        rejection: input.rejection as unknown as Prisma.InputJsonValue,
        summary: input.summary,
        modelVersion: input.modelVersion,
        expiresAt: input.expiresAt,
      },
    });
    return signal.id;
  }

  async findById(id: string, userId: string): Promise<SignalRecord | null> {
    const row = await this.prisma.signal.findFirst({
      where: { id, userId },
      include: { instrument: { include: { exchange: true } } },
    });
    return row ? toRecord(row) : null;
  }

  async listByUser(userId: string, filter: SignalListFilter): Promise<Page<SignalRecord>> {
    const req = normalizePageRequest(filter);
    const where: Prisma.SignalWhereInput = { userId };
    if (filter.instrumentId) where.instrumentId = filter.instrumentId;
    if (filter.type) where.type = filter.type as Prisma.SignalWhereInput['type'];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.signal.findMany({
        where,
        include: { instrument: { include: { exchange: true } } },
        orderBy: { generatedAt: 'desc' },
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.signal.count({ where }),
    ]);
    return buildPage(rows.map(toRecord), total, req);
  }
}
