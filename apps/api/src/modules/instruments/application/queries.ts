import type { IQuery, IQueryHandler } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { NotFoundError } from '../../../shared/errors';
import type {
  IInstrumentReadRepository,
  InstrumentSearchFilter,
} from '../domain/instrument.repository';
import type { ExchangeDto, InstrumentDto } from './dto';

export class SearchInstrumentsQuery implements IQuery {
  constructor(readonly filter: InstrumentSearchFilter) {}
}

export class SearchInstrumentsHandler
  implements IQueryHandler<SearchInstrumentsQuery, Page<InstrumentDto>>
{
  constructor(private readonly repo: IInstrumentReadRepository) {}
  execute(query: SearchInstrumentsQuery): Promise<Page<InstrumentDto>> {
    return this.repo.search(query.filter);
  }
}

export class GetInstrumentQuery implements IQuery {
  constructor(readonly id: string) {}
}

export class GetInstrumentHandler implements IQueryHandler<GetInstrumentQuery, InstrumentDto> {
  constructor(private readonly repo: IInstrumentReadRepository) {}
  async execute(query: GetInstrumentQuery): Promise<InstrumentDto> {
    const instrument = await this.repo.findById(query.id);
    if (!instrument) throw new NotFoundError('Instrument');
    return instrument;
  }
}

export class ListExchangesQuery implements IQuery {}

export class ListExchangesHandler implements IQueryHandler<ListExchangesQuery, ExchangeDto[]> {
  constructor(private readonly repo: IInstrumentReadRepository) {}
  execute(_query: ListExchangesQuery): Promise<ExchangeDto[]> {
    return this.repo.listExchanges();
  }
}
