import type { IQuery, IQueryHandler } from '../../../shared/application';
import { buildPage, type Page } from '../../../shared/domain';
import { NotFoundError } from '../../../shared/errors';
import type { IUserRepository, UserListFilter } from '../../auth/domain/repositories/user.repository';
import { toUserProfile, type UserProfileDto } from '../../auth/application/dto/auth.dto';
import { toUserSummary, type UserSummaryDto } from './dto';

/** Admin: paginated user listing with optional status/search filters. */
export class ListUsersQuery implements IQuery {
  constructor(readonly filter: UserListFilter) {}
}

export class ListUsersHandler implements IQueryHandler<ListUsersQuery, Page<UserSummaryDto>> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(query: ListUsersQuery): Promise<Page<UserSummaryDto>> {
    const page = await this.userRepo.list(query.filter);
    return buildPage(page.items.map(toUserSummary), page.total, {
      page: page.page,
      pageSize: page.pageSize,
    });
  }
}

/** Admin: full profile (with roles/permissions) for a specific user. */
export class GetUserQuery implements IQuery {
  constructor(readonly userId: string) {}
}

export class GetUserHandler implements IQueryHandler<GetUserQuery, UserProfileDto> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(query: GetUserQuery): Promise<UserProfileDto> {
    const user = await this.userRepo.findById(query.userId);
    if (!user) throw new NotFoundError('User');
    const access = await this.userRepo.getAccessControl(query.userId);
    return toUserProfile(user, access);
  }
}
