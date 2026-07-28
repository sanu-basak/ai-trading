import type { Request, Response } from 'express';
import type { CommandBus, QueryBus } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { sendCreated, sendNoContent, sendOk, sendPage } from '../../../http/response';
import type { OrderRecord, TradeRecord } from '../domain/paper.repository';
import {
  CancelOrderCommand,
  CreatePaperAccountCommand,
  DeletePaperAccountCommand,
  GetPaperAccountQuery,
  ListPaperAccountsQuery,
  ListPaperOrdersQuery,
  ListPaperTradesQuery,
  PlaceOrderCommand,
  type PaperAccountDetailDto,
  type PaperAccountDto,
  type PlaceOrderResultDto,
} from '../application';

export class PaperTradingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  listAccounts = async (req: Request, res: Response): Promise<void> => {
    const accounts = await this.queryBus.execute<PaperAccountDto[]>(
      new ListPaperAccountsQuery(req.user!.id),
    );
    sendOk(res, accounts);
  };

  getAccount = async (req: Request, res: Response): Promise<void> => {
    const detail = await this.queryBus.execute<PaperAccountDetailDto>(
      new GetPaperAccountQuery(req.user!.id, req.params.id!),
    );
    sendOk(res, detail);
  };

  createAccount = async (req: Request, res: Response): Promise<void> => {
    const { name, startingCapital, currency } = req.body as {
      name: string;
      startingCapital: number;
      currency?: string;
    };
    const created = await this.commandBus.execute<PaperAccountDto>(
      new CreatePaperAccountCommand(req.user!.id, name, startingCapital, currency),
    );
    sendCreated(res, created);
  };

  deleteAccount = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(
      new DeletePaperAccountCommand(req.user!.id, req.params.id!),
    );
    sendNoContent(res);
  };

  placeOrder = async (req: Request, res: Response): Promise<void> => {
    const b = req.body as {
      instrumentId: string;
      side: 'BUY' | 'SELL';
      type: 'MARKET' | 'LIMIT';
      quantity: number;
      limitPrice?: number;
    };
    const result = await this.commandBus.execute<PlaceOrderResultDto>(
      new PlaceOrderCommand(
        req.user!.id,
        req.params.id!,
        b.instrumentId,
        b.side,
        b.type,
        b.quantity,
        b.limitPrice,
      ),
    );
    sendCreated(res, result);
  };

  cancelOrder = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(
      new CancelOrderCommand(req.user!.id, req.params.id!, req.params.orderId!),
    );
    sendNoContent(res);
  };

  listOrders = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { page?: number; pageSize?: number; openOnly?: boolean };
    const page = await this.queryBus.execute<Page<OrderRecord>>(
      new ListPaperOrdersQuery(
        req.user!.id,
        req.params.id!,
        { page: q.page ?? 1, pageSize: q.pageSize ?? 20 },
        q.openOnly ?? false,
      ),
    );
    sendPage(res, page);
  };

  listTrades = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { page?: number; pageSize?: number };
    const page = await this.queryBus.execute<Page<TradeRecord>>(
      new ListPaperTradesQuery(req.user!.id, req.params.id!, {
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 20,
      }),
    );
    sendPage(res, page);
  };
}
