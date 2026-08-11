import type { ICommand, ICommandHandler } from '../../../shared/application';
import { DomainError, NotFoundError, ValidationError } from '../../../shared/errors';
import type { IInstrumentReadRepository } from '../../instruments';
import { Alert } from '../domain/alert.entity';
import type { AlertCondition } from '../domain/alert-condition';
import type { IAlertRepository } from '../domain/alert.repository';
import type { INotificationRepository } from '../domain/notification.repository';
import type { AlertView } from '../domain/alert.repository';

export const MAX_ALERTS_PER_USER = 100;

async function loadOwned(repo: IAlertRepository, id: string, userId: string): Promise<Alert> {
  const alert = await repo.findById(id);
  if (!alert || !alert.isOwnedBy(userId)) throw new NotFoundError('Alert');
  return alert;
}

export class CreateAlertCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly instrumentId: string,
    readonly name: string,
    readonly condition: AlertCondition,
    readonly options: { channels?: string[]; cooldownSec?: number; isRepeating?: boolean } = {},
  ) {}
}

export class CreateAlertHandler implements ICommandHandler<CreateAlertCommand, AlertView> {
  constructor(
    private readonly repo: IAlertRepository,
    private readonly instrumentRepo: IInstrumentReadRepository,
  ) {}

  async execute(command: CreateAlertCommand): Promise<AlertView> {
    if ((await this.repo.countActiveByUser(command.userId)) >= MAX_ALERTS_PER_USER) {
      throw new DomainError(`You can have at most ${MAX_ALERTS_PER_USER} active alerts`);
    }
    if (!(await this.instrumentRepo.existsById(command.instrumentId))) {
      throw new NotFoundError('Instrument');
    }
    const result = Alert.create({
      userId: command.userId,
      instrumentId: command.instrumentId,
      name: command.name,
      condition: command.condition,
      channels: command.options.channels,
      cooldownSec: command.options.cooldownSec,
      isRepeating: command.options.isRepeating,
    });
    if (result.isFailure) throw new ValidationError(result.getError());
    const alert = result.getValue();
    await this.repo.create(alert);
    const views = await this.repo.listByUser(command.userId);
    return views.find((v) => v.id === alert.id.toString())!;
  }
}

export class SetAlertStatusCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
    readonly action: 'pause' | 'resume',
  ) {}
}

export class SetAlertStatusHandler implements ICommandHandler<SetAlertStatusCommand, void> {
  constructor(private readonly repo: IAlertRepository) {}
  async execute(command: SetAlertStatusCommand): Promise<void> {
    const alert = await loadOwned(this.repo, command.id, command.userId);
    if (command.action === 'pause') alert.pause();
    else alert.resume();
    await this.repo.save(alert);
  }
}

export class DeleteAlertCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class DeleteAlertHandler implements ICommandHandler<DeleteAlertCommand, void> {
  constructor(private readonly repo: IAlertRepository) {}
  async execute(command: DeleteAlertCommand): Promise<void> {
    await loadOwned(this.repo, command.id, command.userId);
    await this.repo.delete(command.id);
  }
}

// --- Notifications ---

export class MarkNotificationReadCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly id: string,
  ) {}
}

export class MarkNotificationReadHandler
  implements ICommandHandler<MarkNotificationReadCommand, void>
{
  constructor(private readonly repo: INotificationRepository) {}
  async execute(command: MarkNotificationReadCommand): Promise<void> {
    const ok = await this.repo.markRead(command.id, command.userId);
    if (!ok) throw new NotFoundError('Notification');
  }
}

export class MarkAllNotificationsReadCommand implements ICommand {
  constructor(readonly userId: string) {}
}

export class MarkAllNotificationsReadHandler
  implements ICommandHandler<MarkAllNotificationsReadCommand, { updated: number }>
{
  constructor(private readonly repo: INotificationRepository) {}
  async execute(command: MarkAllNotificationsReadCommand): Promise<{ updated: number }> {
    const updated = await this.repo.markAllRead(command.userId);
    return { updated };
  }
}
