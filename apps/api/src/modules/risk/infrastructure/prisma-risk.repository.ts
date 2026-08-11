import type { PrismaClient, RiskProfile } from '@prisma/client';
import {
  DEFAULT_RISK_PROFILE,
  type IRiskProfileRepository,
  type RiskProfileView,
  type UpdateRiskProfileInput,
} from '../domain/risk.repository';

function toView(row: RiskProfile): RiskProfileView {
  return {
    accountSize: Number(row.accountSize),
    currency: row.currency,
    maxRiskPerTradePct: Number(row.maxRiskPerTradePct),
    maxPortfolioRiskPct: Number(row.maxPortfolioRiskPct),
    maxOpenPositions: row.maxOpenPositions,
    maxDailyLossPct: Number(row.maxDailyLossPct),
    maxDrawdownPct: Number(row.maxDrawdownPct),
    defaultRiskReward: Number(row.defaultRiskReward),
    positionSizingModel: row.positionSizingModel,
  };
}

export class PrismaRiskProfileRepository implements IRiskProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(userId: string): Promise<RiskProfileView> {
    const row = await this.prisma.riskProfile.findUnique({ where: { userId } });
    return row ? toView(row) : { ...DEFAULT_RISK_PROFILE };
  }

  async upsert(userId: string, input: UpdateRiskProfileInput): Promise<RiskProfileView> {
    const current = await this.get(userId);
    const merged = { ...current, ...input };
    const row = await this.prisma.riskProfile.upsert({
      where: { userId },
      create: {
        userId,
        accountSize: merged.accountSize,
        currency: merged.currency,
        maxRiskPerTradePct: merged.maxRiskPerTradePct,
        maxPortfolioRiskPct: merged.maxPortfolioRiskPct,
        maxOpenPositions: merged.maxOpenPositions,
        maxDailyLossPct: merged.maxDailyLossPct,
        maxDrawdownPct: merged.maxDrawdownPct,
        defaultRiskReward: merged.defaultRiskReward,
        positionSizingModel: merged.positionSizingModel,
      },
      update: {
        accountSize: merged.accountSize,
        currency: merged.currency,
        maxRiskPerTradePct: merged.maxRiskPerTradePct,
        maxPortfolioRiskPct: merged.maxPortfolioRiskPct,
        maxOpenPositions: merged.maxOpenPositions,
        maxDailyLossPct: merged.maxDailyLossPct,
        maxDrawdownPct: merged.maxDrawdownPct,
        defaultRiskReward: merged.defaultRiskReward,
        positionSizingModel: merged.positionSizingModel,
      },
    });
    return toView(row);
  }
}
