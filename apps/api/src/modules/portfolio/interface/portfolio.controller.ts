import type { Request, Response } from 'express';
import type { CommandBus, QueryBus } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { sendCreated, sendNoContent, sendOk, sendPage } from '../../../http/response';
import type { PortfolioTxType } from '../domain/position-math';
import type { TransactionRecord } from '../domain/portfolio.repository';
import {
  AddTransactionCommand,
  CreatePortfolioCommand,
  DeletePortfolioCommand,
  GetPortfolioQuery,
  ListPortfoliosQuery,
  ListPortfolioTransactionsQuery,
  UpdatePortfolioCommand,
  type PortfolioDetailDto,
  type PortfolioDto,
} from '../application';

export class PortfolioController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const items = await this.queryBus.execute<PortfolioDto[]>(new ListPortfoliosQuery(req.user!.id));
    sendOk(res, items);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const detail = await this.queryBus.execute<PortfolioDetailDto>(
      new GetPortfolioQuery(req.user!.id, req.params.id!),
    );
    sendOk(res, detail);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, baseCurrency } = req.body as { name: string; baseCurrency?: string };
    const created = await this.commandBus.execute<PortfolioDto>(
      new CreatePortfolioCommand(req.user!.id, name, baseCurrency),
    );
    sendCreated(res, created);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body as { name: string };
    const updated = await this.commandBus.execute<PortfolioDto>(
      new UpdatePortfolioCommand(req.user!.id, req.params.id!, name),
    );
    sendOk(res, updated);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(new DeletePortfolioCommand(req.user!.id, req.params.id!));
    sendNoContent(res);
  };

  addTransaction = async (req: Request, res: Response): Promise<void> => {
    const b = req.body as {
      instrumentId: string;
      type: PortfolioTxType;
      quantity: number;
      price: number;
      fees: number;
      executedAt?: Date;
      note?: string | null;
    };
    await this.commandBus.execute<void>(
      new AddTransactionCommand(
        req.user!.id,
        req.params.id!,
        b.instrumentId,
        b.type,
        b.quantity,
        b.price,
        b.fees ?? 0,
        b.executedAt ?? new Date(),
        b.note,
      ),
    );
    const detail = await this.queryBus.execute<PortfolioDetailDto>(
      new GetPortfolioQuery(req.user!.id, req.params.id!),
    );
    sendCreated(res, detail);
  };

  listTransactions = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { page?: number; pageSize?: number };
    const page = await this.queryBus.execute<Page<TransactionRecord>>(
      new ListPortfolioTransactionsQuery(req.user!.id, req.params.id!, {
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 20,
      }),
    );
    sendPage(res, page);
  };
}
