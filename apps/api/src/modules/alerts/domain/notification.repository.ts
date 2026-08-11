import type { Page, PageRequest } from '../../../shared/domain';

export interface NotificationView {
  id: string;
  category: string;
  channel: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  category: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<string>;
  listByUser(
    userId: string,
    page: PageRequest,
    unreadOnly: boolean,
  ): Promise<Page<NotificationView>>;
  unreadCount(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<boolean>;
  markAllRead(userId: string): Promise<number>;
}
