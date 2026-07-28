import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  CreateVerificationTokenInput,
  IVerificationTokenRepository,
  VerificationTokenRecord,
  VerificationTokenType,
} from '../../domain/repositories/verification-token.repository';

export class PrismaVerificationTokenRepository implements IVerificationTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateVerificationTokenInput): Promise<void> {
    await this.prisma.verificationToken.create({
      data: {
        userId: input.userId,
        type: input.type,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        payload: (input.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  async findValidByHash(
    tokenHash: string,
    type: VerificationTokenType,
  ): Promise<VerificationTokenRecord | null> {
    const row = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (!row || row.type !== type || row.usedAt !== null || row.expiresAt <= new Date()) {
      return null;
    }
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as VerificationTokenType,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      payload: row.payload,
    };
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.verificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateAllForUser(userId: string, type: VerificationTokenType): Promise<void> {
    await this.prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
