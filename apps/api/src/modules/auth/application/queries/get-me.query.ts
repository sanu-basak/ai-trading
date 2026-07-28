import type { IQuery, IQueryHandler } from '../../../../shared/application';
import { NotFoundError } from '../../../../shared/errors';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import { toUserProfile, type UserProfileDto } from '../dto/auth.dto';

export class GetMeQuery implements IQuery {
  constructor(readonly userId: string) {}
}

/** Returns the authenticated user's profile with roles and permissions. */
export class GetMeHandler implements IQueryHandler<GetMeQuery, UserProfileDto> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(query: GetMeQuery): Promise<UserProfileDto> {
    const user = await this.userRepo.findById(query.userId);
    if (!user) throw new NotFoundError('User');
    const access = await this.userRepo.getAccessControl(query.userId);
    return toUserProfile(user, access);
  }
}
