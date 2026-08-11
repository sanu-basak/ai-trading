import { Prisma, type PrismaClient } from '@prisma/client';
import { buildPage, normalizePageRequest, type Page, type PageRequest } from '../../../shared/domain';
import type {
  CreateNotificationInput,
  INotificationRepository,
  NotificationView,
} from '../domain/notification.repository';

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateNotificationInput): Promise<string> {
    const n = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        category: input.category as Prisma.NotificationUncheckedCreateInput['category'],
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    });
    return n.id;
  }

  async listByUser(
    userId: string,
    page: PageRequest,
    unreadOnly: boolean,
  ): Promise<Page<NotificationView>> {
    const req = normalizePageRequest(page);
    const where: Prisma.NotificationWhereInput = { userId, ...(unreadOnly ? { isRead: false } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    const items: NotificationView[] = rows.map((r) => ({
      id: r.id,
      category: r.category,
      channel: r.channel,
      title: r.title,
      body: r.body,
      data: r.data,
      isRead: r.isRead,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
    return buildPage(items, total, req);
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }
}
