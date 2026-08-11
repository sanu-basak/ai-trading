export interface RiskProfileView {
  accountSize: number;
  currency: string;
  maxRiskPerTradePct: number;
  maxPortfolioRiskPct: number;
  maxOpenPositions: number;
  maxDailyLossPct: number;
  maxDrawdownPct: number;
  defaultRiskReward: number;
  positionSizingModel: string;
}

export interface UpdateRiskProfileInput {
  accountSize?: number;
  currency?: string;
  maxRiskPerTradePct?: number;
  maxPortfolioRiskPct?: number;
  maxOpenPositions?: number;
  maxDailyLossPct?: number;
  maxDrawdownPct?: number;
  defaultRiskReward?: number;
  positionSizingModel?: string;
}

/** Sensible defaults when a user has no saved risk profile yet. */
export const DEFAULT_RISK_PROFILE: RiskProfileView = {
  accountSize: 100_000,
  currency: 'INR',
  maxRiskPerTradePct: 1,
  maxPortfolioRiskPct: 6,
  maxOpenPositions: 5,
  maxDailyLossPct: 3,
  maxDrawdownPct: 20,
  defaultRiskReward: 2,
  positionSizingModel: 'fixed_fractional',
};

export interface IRiskProfileRepository {
  /** Returns the user's profile, or the defaults if none is saved. */
  get(userId: string): Promise<RiskProfileView>;
  upsert(userId: string, input: UpdateRiskProfileInput): Promise<RiskProfileView>;
}
