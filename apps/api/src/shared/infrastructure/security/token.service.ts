import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { AppConfig } from '../config';
import { UnauthorizedError } from '../../errors';
import { ErrorCode } from '../../errors';

export interface AccessTokenClaims {
  sub: string; // user id
  email: string;
  roles: string[];
  permissions: string[];
  type: 'access';
}

export interface RefreshTokenClaims {
  sub: string;
  sessionId: string;
  type: 'refresh';
}

/**
 * Issues and verifies stateless JWT access tokens and stateful-by-session
 * refresh tokens. Access and refresh tokens are signed with distinct secrets.
 */
export class TokenService {
  constructor(private readonly config: AppConfig) {}

  signAccessToken(claims: Omit<AccessTokenClaims, 'type'>): string {
    const options: SignOptions = {
      expiresIn: this.config.env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
      issuer: 'devquantic',
    };
    return jwt.sign({ ...claims, type: 'access' }, this.config.env.JWT_ACCESS_SECRET, options);
  }

  signRefreshToken(claims: Omit<RefreshTokenClaims, 'type'>): string {
    const options: SignOptions = {
      expiresIn: this.config.env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
      issuer: 'devquantic',
    };
    return jwt.sign({ ...claims, type: 'refresh' }, this.config.env.JWT_REFRESH_SECRET, options);
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return this.verify<AccessTokenClaims>(token, this.config.env.JWT_ACCESS_SECRET, 'access');
  }

  verifyRefreshToken(token: string): RefreshTokenClaims {
    return this.verify<RefreshTokenClaims>(token, this.config.env.JWT_REFRESH_SECRET, 'refresh');
  }

  private verify<T extends JwtPayload & { type: string }>(
    token: string,
    secret: string,
    expectedType: 'access' | 'refresh',
  ): T {
    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, secret, { issuer: 'devquantic' });
    } catch (err) {
      const isExpired = err instanceof jwt.TokenExpiredError;
      throw new UnauthorizedError(
        isExpired ? 'Token has expired' : 'Invalid token',
        isExpired ? ErrorCode.TOKEN_EXPIRED : ErrorCode.TOKEN_INVALID,
      );
    }
    if (typeof decoded === 'string' || decoded.type !== expectedType) {
      throw new UnauthorizedError('Invalid token type', ErrorCode.TOKEN_INVALID);
    }
    return decoded as T;
  }
}
