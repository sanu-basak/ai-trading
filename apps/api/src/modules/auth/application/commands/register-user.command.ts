import { createId } from '@paralleldrive/cuid2';
import type { ICommand, ICommandHandler } from '../../../../shared/application';
import type { IEventBus } from '../../../../shared/application';
import { ConflictError, ValidationError } from '../../../../shared/errors';
import type { Logger } from '../../../../shared/infrastructure/logger';
import type { PasswordService, CryptoService } from '../../../../shared/infrastructure/security';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { User } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import type { IVerificationTokenRepository } from '../../domain/repositories/verification-token.repository';
import type { AuthResultDto } from '../dto/auth.dto';
import { toUserProfile } from '../dto/auth.dto';
import { AuthTokenService, type SessionMeta } from '../services/auth-token.service';

/** The default role assigned to every newly-registered user. */
export const DEFAULT_ROLE = 'USER';
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class RegisterUserCommand implements ICommand {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly firstName?: string,
    readonly lastName?: string,
    readonly meta: SessionMeta = {},
  ) {}
}

export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand, AuthResultDto>
{
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly verificationTokenRepo: IVerificationTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly crypto: CryptoService,
    private readonly authTokenService: AuthTokenService,
    private readonly eventBus: IEventBus,
    private readonly logger: Logger,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthResultDto> {
    const emailResult = Email.create(command.email);
    if (emailResult.isFailure) throw new ValidationError(emailResult.getError());
    const email = emailResult.getValue();

    const passwordResult = Password.create(command.password);
    if (passwordResult.isFailure) throw new ValidationError(passwordResult.getError());

    if (await this.userRepo.existsByEmail(email.value)) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(passwordResult.getValue().value);

    const userResult = User.create({
      email,
      passwordHash,
      firstName: command.firstName ?? null,
      lastName: command.lastName ?? null,
      referralCode: createId(),
    });
    if (userResult.isFailure) throw new ValidationError(userResult.getError());
    const user = userResult.getValue();

    await this.userRepo.createWithRole(user, DEFAULT_ROLE);

    // Issue an email-verification token (delivery handled by the notifications
    // module). The raw token is hashed before storage.
    const rawToken = this.crypto.randomToken();
    await this.verificationTokenRepo.create({
      userId: user.id.toString(),
      type: 'EMAIL_VERIFICATION',
      tokenHash: this.crypto.hashToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });

    await this.eventBus.publishAll(user.pullDomainEvents());
    this.logger.info({ userId: user.id.toString() }, 'User registered');

    const access = await this.userRepo.getAccessControl(user.id.toString());
    const tokens = await this.authTokenService.issue(user, access, command.meta);

    return { user: toUserProfile(user, access), tokens };
  }
}
