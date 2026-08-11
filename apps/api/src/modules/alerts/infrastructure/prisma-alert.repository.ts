import { Prisma, type PrismaClient, type Alert as PrismaAlert } from '@prisma/client';
import { UniqueEntityID } from '../../../shared/domain';
import { Alert, type AlertStatus } from '../domain/alert.entity';
import type { AlertCondition } from '../domain/alert-condition';
import type {
  AlertView,
  EvaluableAlert,
  IAlertRepository,
  TriggerAlertInput,
} from '../domain/alert.repository';

function toDomain(row: PrismaAlert): Alert {
  return Alert.reconstitute(
    {
      userId: row.userId,
      instrumentId: row.instrumentId ?? '',
      name: row.name,
      type: 'PRICE',
      condition: row.condition as unknown as AlertCondition,
      status: row.status as AlertStatus,
      channels: row.channels as unknown as string[],
      cooldownSec: row.cooldownSec,
      isRepeating: row.isRepeating,
      triggerCount: row.triggerCount,
      lastTriggeredAt: row.lastTriggeredAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    new UniqueEntityID(row.id),
  );
}

export class PrismaAlertRepository implements IAlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(alert: Alert): Promise<void> {
    const p = alert.toPersistenceProps();
    await this.prisma.alert.create({
      data: {
        id: alert.id.toString(),
        userId: p.userId,
        instrumentId: p.instrumentId,
        name: p.name,
        type: p.type as Prisma.AlertUncheckedCreateInput['type'],
        status: p.status as Prisma.AlertUncheckedCreateInput['status'],
        condition: p.condition as unknown as Prisma.InputJsonValue,
        channels: p.channels as Prisma.AlertUncheckedCreateInput['channels'],
        cooldownSec: p.cooldownSec,
        isRepeating: p.isRepeating,
        expiresAt: p.expiresAt,
      },
    });
  }

  async save(alert: Alert): Promise<void> {
    const p = alert.toPersistenceProps();
    await this.prisma.alert.update({
      where: { id: alert.id.toString() },
      data: {
        name: p.name,
        status: p.status as Prisma.AlertUncheckedUpdateInput['status'],
        condition: p.condition as unknown as Prisma.InputJsonValue,
        channels: p.channels as Prisma.AlertUncheckedUpdateInput['channels'],
        cooldownSec: p.cooldownSec,
        isRepeating: p.isRepeating,
        triggerCount: p.triggerCount,
        lastTriggeredAt: p.lastTriggeredAt,
        expiresAt: p.expiresAt,
      },
    });
  }

  async findById(id: string): Promise<Alert | null> {
    const row = await this.prisma.alert.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<AlertView[]> {
    const rows = await this.prisma.alert.findMany({
      where: { userId },
      include: { instrument: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      instrumentId: r.instrumentId ?? '',
      symbol: r.instrument?.symbol ?? '',
      name: r.name,
      type: r.type,
      status: r.status,
      condition: r.condition as unknown as AlertCondition,
      channels: r.channels as unknown as string[],
      isRepeating: r.isRepeating,
      triggerCount: r.triggerCount,
      lastTriggeredAt: r.lastTriggeredAt ? r.lastTriggeredAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.alert.delete({ where: { id } });
  }

  async countActiveByUser(userId: string): Promise<number> {
    return this.prisma.alert.count({ where: { userId, status: 'ACTIVE' } });
  }

  async listEvaluable(limit: number): Promise<EvaluableAlert[]> {
    const now = new Date();
    const rows = await this.prisma.alert.findMany({
      where: {
        status: 'ACTIVE',
        instrumentId: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { instrument: { include: { exchange: true } } },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });
    return rows
      .filter((r) => r.instrument !== null)
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        instrumentId: r.instrumentId as string,
        name: r.name,
        symbol: r.instrument!.symbol,
        exchange: r.instrument!.exchange.code,
        assetClass: r.instrument!.assetClass,
        condition: r.condition as unknown as AlertCondition,
        channels: r.channels as unknown as string[],
        cooldownSec: r.cooldownSec,
        isRepeating: r.isRepeating,
        lastTriggeredAt: r.lastTriggeredAt,
        expiresAt: r.expiresAt,
      }));
  }

  async trigger(input: TriggerAlertInput): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      await tx.alertTrigger.create({
        data: {
          alertId: input.alertId,
          triggeredAt: input.lastTriggeredAt,
          payload: input.payload as Prisma.InputJsonValue,
        },
      });
      await tx.alert.update({
        where: { id: input.alertId },
        data: {
          status: input.newStatus as Prisma.AlertUncheckedUpdateInput['status'],
          triggerCount: { increment: 1 },
          lastTriggeredAt: input.lastTriggeredAt,
        },
      });
      const notification = await tx.notification.create({
        data: {
          userId: input.userId,
          category: 'ALERT',
          channel: 'IN_APP',
          status: 'SENT',
          title: input.notification.title,
          body: input.notification.body,
          data: input.notification.data as Prisma.InputJsonValue,
          sentAt: input.lastTriggeredAt,
        },
      });
      return notification.id;
    });
  }
}
