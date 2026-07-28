import type { ICommand, ICommandHandler, IEventBus } from '../../../../shared/application';
import { BadRequestError, NotFoundError, ValidationError } from '../../../../shared/errors';
import type { CryptoService, PasswordService } from '../../../../shared/infrastructure/security';
import { Password } from '../../domain/value-objects/password.vo';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository';
import type { IVerificationTokenRepository } from '../../domain/repositories/verification-token.repository';

export class ResetPasswordCommand implements ICommand {
  constructor(
    readonly token: string,
    readonly newPassword: string,
  ) {}
}

/** Consumes a reset token, sets a new password, and revokes all sessions. */
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand, void> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly verificationTokenRepo: IVerificationTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly crypto: CryptoService,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const tokenHash = this.crypto.hashToken(command.token);
    const record = await this.verificationTokenRepo.findValidByHash(tokenHash, 'PASSWORD_RESET');
    if (!record) throw new BadRequestError('Invalid or expired reset link');

    const passwordResult = Password.create(command.newPassword);
    if (passwordResult.isFailure) throw new ValidationError(passwordResult.getError());

    const user = await this.userRepo.findById(record.userId);
    if (!user) throw new NotFoundError('User');

    const newHash = await this.passwordService.hash(passwordResult.getValue().value);
    user.changePassword(newHash);
    await this.userRepo.save(user);
    await this.verificationTokenRepo.markUsed(record.id);
    await this.sessionRepo.revokeAllForUser(user.id.toString());
    await this.eventBus.publishAll(user.pullDomainEvents());
  }
}
