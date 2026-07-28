import type { IQuery, IQueryHandler } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { NotFoundError } from '../../../shared/errors';
import type {
  ISignalRepository,
  SignalListFilter,
  SignalRecord,
} from '../domain/signal.repository';
import { withDisclaimer, type SignalDto } from './dto';

export class ListSignalsQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly filter: SignalListFilter,
  ) {}
}

export class ListSignalsHandler implements IQueryHandler<ListSignalsQuery, Page<SignalRecord>> {
  constructor(private readonly repo: ISignalRepository) {}
  execute(query: ListSignalsQuery): Promise<Page<SignalRecord>> {
    return this.repo.listByUser(query.userId, query.filter);
  }
}

export class GetSignalQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class GetSignalHandler implements IQueryHandler<GetSignalQuery, SignalDto> {
  constructor(private readonly repo: ISignalRepository) {}
  async execute(query: GetSignalQuery): Promise<SignalDto> {
    const record = await this.repo.findById(query.id, query.userId);
    if (!record) throw new NotFoundError('Signal');
    return withDisclaimer(record);
  }
}
