import type { ICommand, ICommandHandler } from '../../../../shared/application';
import type { ISessionRepository } from '../../domain/repositories/session.repository';
import type { AuthTokenService } from '../services/auth-token.service';

export class LogoutCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly refreshToken?: string,
    readonly allDevices = false,
  ) {}
}

/** Revokes the current session (or all sessions when `allDevices` is set). */
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    if (command.allDevices) {
      await this.sessionRepo.revokeAllForUser(command.userId);
      return;
    }
    if (command.refreshToken) {
      const hash = this.authTokenService.hashRefreshToken(command.refreshToken);
      const session = await this.sessionRepo.findByTokenHash(hash);
      if (session && session.userId === command.userId) {
        await this.sessionRepo.revoke(session.id);
      }
    }
  }
}
