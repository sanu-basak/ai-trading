import { createId } from '@paralleldrive/cuid2';
import type { AppConfig } from '../../../../shared/infrastructure/config';
import type { TokenService, CryptoService } from '../../../../shared/infrastructure/security';
import type { User } from '../../domain/entities/user.entity';
import type { AccessControl } from '../../domain/repositories/user.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository';
import type { AuthTokens } from '../dto/auth.dto';
import { parseDurationToSeconds } from './duration';

export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Application service that issues access/refresh token pairs and manages the
 * backing sessions. Refresh tokens are signed JWTs whose SHA-256 hash is stored
 * on the session row — the raw token is never persisted. Rotation revokes the
 * old session and mints a new one (refresh-token rotation).
 */
export class AuthTokenService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionRepo: ISessionRepository,
    private readonly crypto: CryptoService,
    config: AppConfig,
  ) {
    this.accessTtlSeconds = parseDurationToSeconds(config.env.JWT_ACCESS_TTL, 900);
    this.refreshTtlSeconds = parseDurationToSeconds(config.env.JWT_REFRESH_TTL, 2_592_000);
  }

  async issue(user: User, access: AccessControl, meta: SessionMeta): Promise<AuthTokens> {
    const sessionId = createId();

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id.toString(),
      email: user.email.value,
      roles: access.roles,
      permissions: access.permissions,
    });

    const refreshToken = this.tokenService.signRefreshToken({
      sub: user.id.toString(),
      sessionId,
    });

    await this.sessionRepo.create({
      id: sessionId,
      userId: user.id.toString(),
      refreshTokenHash: this.crypto.hashToken(refreshToken),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtlSeconds,
    };
  }

  async rotate(
    oldSessionId: string,
    user: User,
    access: AccessControl,
    meta: SessionMeta,
  ): Promise<AuthTokens> {
    await this.sessionRepo.revoke(oldSessionId);
    return this.issue(user, access, meta);
  }

  hashRefreshToken(token: string): string {
    return this.crypto.hashToken(token);
  }
}
