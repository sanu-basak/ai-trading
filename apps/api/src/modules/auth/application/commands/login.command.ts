import type { ICommand, ICommandHandler, IEventBus } from '../../../../shared/application';
import { ErrorCode, UnauthorizedError } from '../../../../shared/errors';
import type { Logger } from '../../../../shared/infrastructure/logger';
import type { PasswordService } from '../../../../shared/infrastructure/security';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import type { AuthResultDto } from '../dto/auth.dto';
import { toUserProfile } from '../dto/auth.dto';
import { AuthTokenService, type SessionMeta } from '../services/auth-token.service';

export class LoginCommand implements ICommand {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly meta: SessionMeta = {},
  ) {}
}

/**
 * Verifies credentials with constant messaging (no account enumeration),
 * enforces the lockout invariant, and issues a token pair on success.
 */
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResultDto> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly authTokenService: AuthTokenService,
    private readonly eventBus: IEventBus,
    private readonly logger: Logger,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResultDto> {
    const invalid = (): never => {
      throw new UnauthorizedError('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    };

    const user = await this.userRepo.findByEmail(command.email);
    if (!user || !user.hasPassword()) return invalid();

    const gate = user.canLogin();
    if (!gate.ok) {
      if (gate.reason === 'account_locked') {
        throw new UnauthorizedError(
          'Account temporarily locked due to failed login attempts',
          ErrorCode.ACCOUNT_LOCKED,
        );
      }
      throw new UnauthorizedError('Account is not permitted to sign in', ErrorCode.ACCOUNT_DISABLED);
    }

    const ok = await this.passwordService.verify(user.passwordHash as string, command.password);
    if (!ok) {
      user.recordFailedLogin();
      await this.userRepo.save(user);
      return invalid();
    }

    user.recordSuccessfulLogin(command.meta.ip ?? undefined);
    await this.userRepo.save(user);
    await this.eventBus.publishAll(user.pullDomainEvents());
    this.logger.info({ userId: user.id.toString() }, 'User logged in');

    const access = await this.userRepo.getAccessControl(user.id.toString());
    const tokens = await this.authTokenService.issue(user, access, command.meta);
    return { user: toUserProfile(user, access), tokens };
  }
}
