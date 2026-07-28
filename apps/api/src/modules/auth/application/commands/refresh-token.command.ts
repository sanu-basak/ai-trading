import type { ICommand, ICommandHandler } from '../../../../shared/application';
import { ErrorCode, UnauthorizedError } from '../../../../shared/errors';
import type { Logger } from '../../../../shared/infrastructure/logger';
import type { TokenService } from '../../../../shared/infrastructure/security';
import type { IUserRepository } from '../../domain/repositories/user.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository';
import type { AuthResultDto } from '../dto/auth.dto';
import { toUserProfile } from '../dto/auth.dto';
import { AuthTokenService, type SessionMeta } from '../services/auth-token.service';

export class RefreshTokenCommand implements ICommand {
  constructor(
    readonly refreshToken: string,
    readonly meta: SessionMeta = {},
  ) {}
}

/**
 * Verifies the refresh JWT, matches it to a live session by hash, then rotates
 * the token pair. Detects refresh-token reuse (valid JWT, but the session is
 * missing/revoked) and defensively revokes every session for the user.
 */
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand, AuthResultDto>
{
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly tokenService: TokenService,
    private readonly authTokenService: AuthTokenService,
    private readonly logger: Logger,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthResultDto> {
    const claims = this.tokenService.verifyRefreshToken(command.refreshToken);
    const tokenHash = this.authTokenService.hashRefreshToken(command.refreshToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    const invalid = (): never => {
      throw new UnauthorizedError('Invalid refresh token', ErrorCode.TOKEN_INVALID);
    };

    // Reuse / theft detection: JWT is valid but no matching live session.
    if (!session || session.id !== claims.sessionId || session.userId !== claims.sub) {
      await this.sessionRepo.revokeAllForUser(claims.sub);
      this.logger.warn({ userId: claims.sub }, 'Refresh token reuse detected — revoked all sessions');
      return invalid();
    }
    if (session.revokedAt !== null || session.expiresAt <= new Date()) {
      return invalid();
    }

    const user = await this.userRepo.findById(claims.sub);
    if (!user || !user.canLogin().ok) return invalid();

    const access = await this.userRepo.getAccessControl(user.id.toString());
    const tokens = await this.authTokenService.rotate(session.id, user, access, command.meta);
    return { user: toUserProfile(user, access), tokens };
  }
}
