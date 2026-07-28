import type { Request, Response } from 'express';
import type { QueryBus } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { sendOk, sendPage } from '../../../http/response';
import {
  GetInstrumentQuery,
  ListExchangesQuery,
  SearchInstrumentsQuery,
  type ExchangeDto,
  type InstrumentDto,
} from '../application';

export class InstrumentsController {
  constructor(private readonly queryBus: QueryBus) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as {
      query?: string;
      assetClass?: string;
      exchangeCode?: string;
      page?: number;
      pageSize?: number;
    };
    const page = await this.queryBus.execute<Page<InstrumentDto>>(
      new SearchInstrumentsQuery({
        query: q.query,
        assetClass: q.assetClass,
        exchangeCode: q.exchangeCode,
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 20,
      }),
    );
    sendPage(res, page);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const instrument = await this.queryBus.execute<InstrumentDto>(
      new GetInstrumentQuery(req.params.id!),
    );
    sendOk(res, instrument);
  };

  listExchanges = async (_req: Request, res: Response): Promise<void> => {
    const exchanges = await this.queryBus.execute<ExchangeDto[]>(new ListExchangesQuery());
    sendOk(res, exchanges);
  };
}
