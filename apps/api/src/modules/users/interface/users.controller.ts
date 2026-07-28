import type { Request, Response } from 'express';
import type { CommandBus, QueryBus } from '../../../shared/application';
import type { Page } from '../../../shared/domain';
import { sendNoContent, sendOk, sendPage } from '../../../http/response';
import type { UserProfileDto } from '../../auth/application/dto/auth.dto';
import type { UserStatus } from '../../auth/domain/entities/user.entity';
import {
  GetUserQuery,
  ListUsersQuery,
  UpdateProfileCommand,
  UpdateUserStatusCommand,
  type UpdateProfileInput,
  type UserSummaryDto,
} from '../application';

/** HTTP boundary for user self-service and admin management. */
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  updateMyProfile = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.commandBus.execute<UserProfileDto>(
      new UpdateProfileCommand(req.user!.id, req.body as UpdateProfileInput),
    );
    sendOk(res, profile);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as {
      page?: number;
      pageSize?: number;
      status?: UserStatus;
      search?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    };
    const page = await this.queryBus.execute<Page<UserSummaryDto>>(
      new ListUsersQuery({
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 20,
        status: q.status,
        search: q.search,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
      }),
    );
    sendPage(res, page);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.queryBus.execute<UserProfileDto>(new GetUserQuery(req.params.id!));
    sendOk(res, profile);
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body as { status: UserStatus };
    await this.commandBus.execute<void>(new UpdateUserStatusCommand(req.params.id!, status));
    sendNoContent(res);
  };
}
