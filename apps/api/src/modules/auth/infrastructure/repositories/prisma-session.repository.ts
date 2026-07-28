import type { PrismaClient } from '@prisma/client';
import type {
  CreateSessionInput,
  ISessionRepository,
  SessionRecord,
} from '../../domain/repositories/session.repository';

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSessionInput): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByTokenHash(refreshTokenHash: string): Promise<SessionRecord | null> {
    const row = await this.prisma.session.findUnique({ where: { refreshTokenHash } });
    return row
      ? {
          id: row.id,
          userId: row.userId,
          refreshTokenHash: row.refreshTokenHash,
          expiresAt: row.expiresAt,
          revokedAt: row.revokedAt,
        }
      : null;
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    return row
      ? {
          id: row.id,
          userId: row.userId,
          refreshTokenHash: row.refreshTokenHash,
          expiresAt: row.expiresAt,
          revokedAt: row.revokedAt,
        }
      : null;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
