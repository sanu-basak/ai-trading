import type { Request, Response } from 'express';
import type { CommandBus, QueryBus } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import type { Timeframe } from '../../../market-data';
import { sendCreated, sendOk, sendPage } from '../../../http/response';
import type { SignalRecord } from '../domain/signal.repository';
import {
  AnalyzeInstrumentCommand,
  AnalyzeInstrumentMtfCommand,
  AnalyzeSmcCommand,
  GetSignalQuery,
  ListSignalsQuery,
  RunBacktestCommand,
  type BacktestResultDto,
  type MtfResultDto,
  type SignalDto,
  type SmcResultDto,
} from '../application';

export class AiAnalysisController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  analyze = async (req: Request, res: Response): Promise<void> => {
    const { instrumentId, timeframe } = req.body as { instrumentId: string; timeframe: Timeframe };
    const signal = await this.commandBus.execute<SignalDto>(
      new AnalyzeInstrumentCommand(req.user!.id, instrumentId, timeframe),
    );
    sendCreated(res, signal);
  };

  analyzeMtf = async (req: Request, res: Response): Promise<void> => {
    const { instrumentId, timeframes } = req.body as {
      instrumentId: string;
      timeframes?: Timeframe[];
    };
    const result = await this.commandBus.execute<MtfResultDto>(
      new AnalyzeInstrumentMtfCommand(req.user!.id, instrumentId, timeframes ?? []),
    );
    sendOk(res, result);
  };

  smc = async (req: Request, res: Response): Promise<void> => {
    const { instrumentId, timeframe } = req.body as { instrumentId: string; timeframe: Timeframe };
    const result = await this.commandBus.execute<SmcResultDto>(
      new AnalyzeSmcCommand(req.user!.id, instrumentId, timeframe),
    );
    sendOk(res, result);
  };

  backtest = async (req: Request, res: Response): Promise<void> => {
    const b = req.body as {
      instrumentId: string;
      timeframe: Timeframe;
      strategy: string;
      params?: Record<string, unknown>;
      initialCapital?: number;
      commissionBps?: number;
    };
    const result = await this.commandBus.execute<BacktestResultDto>(
      new RunBacktestCommand(
        req.user!.id,
        b.instrumentId,
        b.timeframe,
        b.strategy,
        b.params ?? {},
        b.initialCapital ?? 100_000,
        b.commissionBps ?? 5,
      ),
    );
    sendOk(res, result);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as {
      instrumentId?: string;
      type?: string;
      page?: number;
      pageSize?: number;
    };
    const page = await this.queryBus.execute<Page<SignalRecord>>(
      new ListSignalsQuery(req.user!.id, {
        instrumentId: q.instrumentId,
        type: q.type,
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 20,
      }),
    );
    sendPage(res, page);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const signal = await this.queryBus.execute<SignalDto>(
      new GetSignalQuery(req.user!.id, req.params.id!),
    );
    sendOk(res, signal);
  };
}
