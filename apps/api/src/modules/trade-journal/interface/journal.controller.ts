import type { Request, Response } from 'express';
import type { CommandBus, QueryBus } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { sendCreated, sendNoContent, sendOk, sendPage } from '../../../http/response';
import type { JournalStats } from '../domain/journal-math';
import type { ReviewInput, TradeSide } from '../domain/journal-trade.entity';
import type { JournalTradeView } from '../domain/journal.repository';
import {
  CloseJournalTradeCommand,
  CreateJournalTradeCommand,
  DeleteJournalTradeCommand,
  GetJournalTradeQuery,
  JournalStatsQuery,
  ListJournalTradesQuery,
  ReviewJournalTradeCommand,
  type CreateJournalInput,
} from '../application';

export class JournalController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { status?: string; instrumentId?: string; page?: number; pageSize?: number };
    const page = await this.queryBus.execute<Page<JournalTradeView>>(
      new ListJournalTradesQuery(req.user!.id, {
        status: q.status,
        instrumentId: q.instrumentId,
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 20,
      }),
    );
    sendPage(res, page);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const trade = await this.queryBus.execute<JournalTradeView>(
      new GetJournalTradeQuery(req.user!.id, req.params.id!),
    );
    sendOk(res, trade);
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { instrumentId?: string };
    const stats = await this.queryBus.execute<JournalStats>(
      new JournalStatsQuery(req.user!.id, q.instrumentId),
    );
    sendOk(res, stats);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const b = req.body as { instrumentId: string; side: TradeSide } & CreateJournalInput;
    const { instrumentId, ...input } = b;
    const trade = await this.commandBus.execute<JournalTradeView>(
      new CreateJournalTradeCommand(req.user!.id, instrumentId, input),
    );
    sendCreated(res, trade);
  };

  close = async (req: Request, res: Response): Promise<void> => {
    const b = req.body as { exitPrice: number; exitAt?: Date; fees?: number };
    const trade = await this.commandBus.execute<JournalTradeView>(
      new CloseJournalTradeCommand(req.user!.id, req.params.id!, b.exitPrice, b.exitAt, b.fees),
    );
    sendOk(res, trade);
  };

  review = async (req: Request, res: Response): Promise<void> => {
    const trade = await this.commandBus.execute<JournalTradeView>(
      new ReviewJournalTradeCommand(req.user!.id, req.params.id!, req.body as ReviewInput),
    );
    sendOk(res, trade);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(
      new DeleteJournalTradeCommand(req.user!.id, req.params.id!),
    );
    sendNoContent(res);
  };
}
