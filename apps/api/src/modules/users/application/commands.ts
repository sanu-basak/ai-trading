import type { ICommand, ICommandHandler } from '../../../shared/application';
import { NotFoundError } from '../../../shared/errors';
import type { IUserRepository } from '../../auth/domain/repositories/user.repository';
import type { ISessionRepository } from '../../auth/domain/repositories/session.repository';
import type { UserStatus } from '../../auth/domain/entities/user.entity';
import { toUserProfile, type UserProfileDto } from '../../auth/application/dto/auth.dto';

export interface UpdateProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  country?: string | null;
  timezone?: string;
  locale?: string;
}

/** Self-service: update the authenticated user's own profile. */
export class UpdateProfileCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly input: UpdateProfileInput,
  ) {}
}

export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand, UserProfileDto> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(command: UpdateProfileCommand): Promise<UserProfileDto> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) throw new NotFoundError('User');
    user.updateProfile(command.input);
    await this.userRepo.save(user);
    const access = await this.userRepo.getAccessControl(command.userId);
    return toUserProfile(user, access);
  }
}

/** Admin: change a user's account status (activate / suspend / ban). */
export class UpdateUserStatusCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly status: UserStatus,
  ) {}
}

export class UpdateUserStatusHandler implements ICommandHandler<UpdateUserStatusCommand, void> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(command: UpdateUserStatusCommand): Promise<void> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) throw new NotFoundError('User');
    user.setStatus(command.status);
    await this.userRepo.save(user);
    // Revoke active sessions when access is withdrawn.
    if (command.status === 'SUSPENDED' || command.status === 'BANNED' || command.status === 'DELETED') {
      await this.sessionRepo.revokeAllForUser(command.userId);
    }
  }
}
