import type { ICommand, ICommandHandler, IEventBus } from '../../../../shared/application';
import { BadRequestError, NotFoundError } from '../../../../shared/errors';
import type { CryptoService } from '../../../../shared/infrastructure/security';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import type { IVerificationTokenRepository } from '../../domain/repositories/verification-token.repository';

export class VerifyEmailCommand implements ICommand {
  constructor(readonly token: string) {}
}

/** Consumes an email-verification token and marks the user's email verified. */
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand, void> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly verificationTokenRepo: IVerificationTokenRepository,
    private readonly crypto: CryptoService,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const tokenHash = this.crypto.hashToken(command.token);
    const record = await this.verificationTokenRepo.findValidByHash(tokenHash, 'EMAIL_VERIFICATION');
    if (!record) throw new BadRequestError('Invalid or expired verification link');

    const user = await this.userRepo.findById(record.userId);
    if (!user) throw new NotFoundError('User');

    user.verifyEmail();
    await this.userRepo.save(user);
    await this.verificationTokenRepo.markUsed(record.id);
    await this.eventBus.publishAll(user.pullDomainEvents());
  }
}
