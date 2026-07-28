import type { ICommand, ICommandHandler } from '../../../../shared/application';
import type { Logger } from '../../../../shared/infrastructure/logger';
import type { CryptoService } from '../../../../shared/infrastructure/security';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import type { IVerificationTokenRepository } from '../../domain/repositories/verification-token.repository';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface IssuedResetToken {
  userId: string;
  rawToken: string;
}

export class RequestPasswordResetCommand implements ICommand {
  constructor(readonly email: string) {}
}

/**
 * Issues a password-reset token. Always resolves successfully regardless of
 * whether the email exists (no account enumeration). Returns the raw token to
 * the caller so the notifications module can deliver it; nothing is exposed to
 * the client via the controller.
 */
export class RequestPasswordResetHandler
  implements ICommandHandler<RequestPasswordResetCommand, IssuedResetToken | null>
{
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly verificationTokenRepo: IVerificationTokenRepository,
    private readonly crypto: CryptoService,
    private readonly logger: Logger,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<IssuedResetToken | null> {
    const user = await this.userRepo.findByEmail(command.email);
    if (!user) {
      this.logger.debug({ email: command.email }, 'Password reset requested for unknown email');
      return null;
    }

    await this.verificationTokenRepo.invalidateAllForUser(user.id.toString(), 'PASSWORD_RESET');

    const rawToken = this.crypto.randomToken();
    await this.verificationTokenRepo.create({
      userId: user.id.toString(),
      type: 'PASSWORD_RESET',
      tokenHash: this.crypto.hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });

    return { userId: user.id.toString(), rawToken };
  }
}
