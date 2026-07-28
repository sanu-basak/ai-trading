import type { Request, Response } from 'express';
import type { AppConfig } from '../../../shared/infrastructure/config';
import type { CommandBus, QueryBus } from '../../../shared/application';
import { UnauthorizedError } from '../../../shared/errors';
import { sendCreated, sendNoContent, sendOk } from '../../../http/response';
import {
  ChangePasswordCommand,
  GetMeQuery,
  LoginCommand,
  LogoutCommand,
  parseDurationToSeconds,
  RefreshTokenCommand,
  RegisterUserCommand,
  RequestPasswordResetCommand,
  ResetPasswordCommand,
  VerifyEmailCommand,
  type AuthResultDto,
  type SessionMeta,
  type UserProfileDto,
} from '../application';

const REFRESH_COOKIE = 'dq_refresh';

/**
 * HTTP boundary for authentication. Stays thin: it validates already-parsed
 * input, dispatches a command/query, manages the refresh-token cookie, and
 * shapes the response. All business logic lives in the application layer.
 */
export class AuthController {
  private readonly refreshTtlSeconds: number;
  private readonly cookiePath = '/api/v1/auth';

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly config: AppConfig,
  ) {
    this.refreshTtlSeconds = parseDurationToSeconds(config.env.JWT_REFRESH_TTL, 2_592_000);
  }

  private meta(req: Request): SessionMeta {
    return { ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: this.cookiePath,
      maxAge: this.refreshTtlSeconds * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: this.cookiePath });
  }

  private readRefreshToken(req: Request): string | undefined {
    const fromBody = (req.body as { refreshToken?: string }).refreshToken;
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    return fromBody ?? fromCookie;
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName } = req.body as {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    };
    const result = await this.commandBus.execute<AuthResultDto>(
      new RegisterUserCommand(email, password, firstName, lastName, this.meta(req)),
    );
    this.setRefreshCookie(res, result.tokens.refreshToken);
    sendCreated(res, result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await this.commandBus.execute<AuthResultDto>(
      new LoginCommand(email, password, this.meta(req)),
    );
    this.setRefreshCookie(res, result.tokens.refreshToken);
    sendOk(res, result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = this.readRefreshToken(req);
    if (!refreshToken) throw new UnauthorizedError('Missing refresh token');
    const result = await this.commandBus.execute<AuthResultDto>(
      new RefreshTokenCommand(refreshToken, this.meta(req)),
    );
    this.setRefreshCookie(res, result.tokens.refreshToken);
    sendOk(res, result);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { allDevices } = req.body as { allDevices?: boolean };
    await this.commandBus.execute<void>(
      new LogoutCommand(userId, this.readRefreshToken(req), allDevices ?? false),
    );
    this.clearRefreshCookie(res);
    sendNoContent(res);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.queryBus.execute<UserProfileDto>(new GetMeQuery(req.user!.id));
    sendOk(res, profile);
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body as { token: string };
    await this.commandBus.execute<void>(new VerifyEmailCommand(token));
    sendOk(res, { verified: true });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email: string };
    await this.commandBus.execute(new RequestPasswordResetCommand(email));
    // Always report success — never reveal whether the email exists.
    sendOk(res, {
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await this.commandBus.execute<void>(new ResetPasswordCommand(token, newPassword));
    sendOk(res, { reset: true });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await this.commandBus.execute<void>(
      new ChangePasswordCommand(req.user!.id, currentPassword, newPassword),
    );
    this.clearRefreshCookie(res);
    sendNoContent(res);
  };
}
