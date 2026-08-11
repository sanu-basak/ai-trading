import type { ICommand, ICommandHandler, IQuery, IQueryHandler } from '../../../shared/application';
import { computePositionSize, type PositionSizeResult, type Side } from '../domain/risk-math';
import type {
  IRiskProfileRepository,
  RiskProfileView,
  UpdateRiskProfileInput,
} from '../domain/risk.repository';

export class GetRiskProfileQuery implements IQuery {
  constructor(readonly userId: string) {}
}

export class GetRiskProfileHandler implements IQueryHandler<GetRiskProfileQuery, RiskProfileView> {
  constructor(private readonly repo: IRiskProfileRepository) {}
  execute(query: GetRiskProfileQuery): Promise<RiskProfileView> {
    return this.repo.get(query.userId);
  }
}

export class UpdateRiskProfileCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly input: UpdateRiskProfileInput,
  ) {}
}

export class UpdateRiskProfileHandler
  implements ICommandHandler<UpdateRiskProfileCommand, RiskProfileView>
{
  constructor(private readonly repo: IRiskProfileRepository) {}
  execute(command: UpdateRiskProfileCommand): Promise<RiskProfileView> {
    return this.repo.upsert(command.userId, command.input);
  }
}

export class PositionSizeQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly entry: number,
    readonly stop: number,
    readonly side: Side,
    readonly target?: number | null,
    readonly accountSize?: number,
    readonly riskPct?: number,
  ) {}
}

/** Sizes a position, falling back to the user's saved risk profile for defaults. */
export class PositionSizeHandler implements IQueryHandler<PositionSizeQuery, PositionSizeResult> {
  constructor(private readonly repo: IRiskProfileRepository) {}
  async execute(query: PositionSizeQuery): Promise<PositionSizeResult> {
    const profile = await this.repo.get(query.userId);
    return computePositionSize({
      accountSize: query.accountSize ?? profile.accountSize,
      riskPct: query.riskPct ?? profile.maxRiskPerTradePct,
      entry: query.entry,
      stop: query.stop,
      side: query.side,
      target: query.target ?? null,
    });
  }
}
