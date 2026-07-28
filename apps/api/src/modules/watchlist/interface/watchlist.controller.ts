import type { Request, Response } from 'express';
import type { CommandBus, QueryBus } from '../../../shared/application';
import { sendCreated, sendNoContent, sendOk } from '../../../http/response';
import {
  AddWatchlistItemCommand,
  CreateWatchlistCommand,
  DeleteWatchlistCommand,
  GetWatchlistQuery,
  ListWatchlistsQuery,
  RemoveWatchlistItemCommand,
  ReorderWatchlistItemsCommand,
  UpdateWatchlistCommand,
  type WatchlistDetailDto,
  type WatchlistDto,
} from '../application';

export class WatchlistController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const items = await this.queryBus.execute<WatchlistDto[]>(new ListWatchlistsQuery(req.user!.id));
    sendOk(res, items);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const detail = await this.queryBus.execute<WatchlistDetailDto>(
      new GetWatchlistQuery(req.user!.id, req.params.id!),
    );
    sendOk(res, detail);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, color } = req.body as { name: string; color?: string | null };
    const created = await this.commandBus.execute<WatchlistDto>(
      new CreateWatchlistCommand(req.user!.id, name, color),
    );
    sendCreated(res, created);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { name, color } = req.body as { name?: string; color?: string | null };
    const updated = await this.commandBus.execute<WatchlistDto>(
      new UpdateWatchlistCommand(req.user!.id, req.params.id!, name, color),
    );
    sendOk(res, updated);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(new DeleteWatchlistCommand(req.user!.id, req.params.id!));
    sendNoContent(res);
  };

  addItem = async (req: Request, res: Response): Promise<void> => {
    const { instrumentId, note } = req.body as { instrumentId: string; note?: string | null };
    await this.commandBus.execute<void>(
      new AddWatchlistItemCommand(req.user!.id, req.params.id!, instrumentId, note),
    );
    const detail = await this.queryBus.execute<WatchlistDetailDto>(
      new GetWatchlistQuery(req.user!.id, req.params.id!),
    );
    sendCreated(res, detail);
  };

  removeItem = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute<void>(
      new RemoveWatchlistItemCommand(req.user!.id, req.params.id!, req.params.instrumentId!),
    );
    sendNoContent(res);
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const { instrumentIds } = req.body as { instrumentIds: string[] };
    await this.commandBus.execute<void>(
      new ReorderWatchlistItemsCommand(req.user!.id, req.params.id!, instrumentIds),
    );
    sendNoContent(res);
  };
}
