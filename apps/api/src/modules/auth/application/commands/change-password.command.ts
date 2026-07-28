import type { ICommand, ICommandHandler, IEventBus } from '../../../../shared/application';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../../shared/errors';
import type { PasswordService } from '../../../../shared/infrastructure/security';
import { Password } from '../../domain/value-objects/password.vo';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository';

export class ChangePasswordCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly currentPassword: string,
    readonly newPassword: string,
  ) {}
}

/**
 * Changes the password after verifying the current one, then revokes all other
 * sessions so a compromised credential cannot outlive the change.
 */
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, void> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly passwordService: PasswordService,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) throw new NotFoundError('User');
    if (!user.hasPassword()) {
      throw new ValidationError('This account has no password set');
    }

    const ok = await this.passwordService.verify(
      user.passwordHash as string,
      command.currentPassword,
    );
    if (!ok) throw new UnauthorizedError('Current password is incorrect');

    const passwordResult = Password.create(command.newPassword);
    if (passwordResult.isFailure) throw new ValidationError(passwordResult.getError());

    const newHash = await this.passwordService.hash(passwordResult.getValue().value);
    user.changePassword(newHash);
    await this.userRepo.save(user);
    await this.sessionRepo.revokeAllForUser(user.id.toString());
    await this.eventBus.publishAll(user.pullDomainEvents());
  }
}
