import type { IQuery, IQueryHandler } from '../../../shared/application';
import type { Page, PageRequest } from '../../../shared/domain';
import type { AlertView, IAlertRepository } from '../domain/alert.repository';
import type {
  INotificationRepository,
  NotificationView,
} from '../domain/notification.repository';

export class ListAlertsQuery implements IQuery {
  constructor(readonly userId: string) {}
}

export class ListAlertsHandler implements IQueryHandler<ListAlertsQuery, AlertView[]> {
  constructor(private readonly repo: IAlertRepository) {}
  execute(query: ListAlertsQuery): Promise<AlertView[]> {
    return this.repo.listByUser(query.userId);
  }
}

export class ListNotificationsQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly page: PageRequest,
    readonly unreadOnly: boolean,
  ) {}
}

export class ListNotificationsHandler
  implements IQueryHandler<ListNotificationsQuery, Page<NotificationView>>
{
  constructor(private readonly repo: INotificationRepository) {}
  execute(query: ListNotificationsQuery): Promise<Page<NotificationView>> {
    return this.repo.listByUser(query.userId, query.page, query.unreadOnly);
  }
}

export class UnreadCountQuery implements IQuery {
  constructor(readonly userId: string) {}
}

export class UnreadCountHandler implements IQueryHandler<UnreadCountQuery, { count: number }> {
  constructor(private readonly repo: INotificationRepository) {}
  async execute(query: UnreadCountQuery): Promise<{ count: number }> {
    return { count: await this.repo.unreadCount(query.userId) };
  }
}
