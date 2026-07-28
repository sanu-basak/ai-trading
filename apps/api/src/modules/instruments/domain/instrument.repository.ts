import type { Page, PageRequest } from '../../../shared/domain';
import type { ExchangeDto, InstrumentDto } from '../application/dto';

export interface InstrumentSearchFilter extends PageRequest {
  query?: string;
  assetClass?: string;
  exchangeCode?: string;
}

/** Read-optimized repository for market reference data. */
export interface IInstrumentReadRepository {
  search(filter: InstrumentSearchFilter): Promise<Page<InstrumentDto>>;
  findById(id: string): Promise<InstrumentDto | null>;
  findBySymbol(exchangeCode: string, symbol: string): Promise<InstrumentDto | null>;
  existsById(id: string): Promise<boolean>;
  listExchanges(): Promise<ExchangeDto[]>;
}
