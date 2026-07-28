import type { User as PrismaUser } from '@prisma/client';
import { UniqueEntityID } from '../../../../shared/domain';
import { Email } from '../../domain/value-objects/email.vo';
import { User, type UserStatus } from '../../domain/entities/user.entity';

/** Translates between the Prisma `User` row and the `User` domain aggregate. */
export const UserMapper = {
  toDomain(row: PrismaUser): User {
    const email = Email.create(row.email).getValue();
    return User.reconstitute(
      {
        email,
        passwordHash: row.passwordHash,
        firstName: row.firstName,
        lastName: row.lastName,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        phone: row.phone,
        country: row.country,
        timezone: row.timezone,
        locale: row.locale,
        status: row.status as UserStatus,
        emailVerified: row.emailVerified,
        emailVerifiedAt: row.emailVerifiedAt,
        twoFactorEnabled: row.twoFactorEnabled,
        lastLoginAt: row.lastLoginAt,
        lastLoginIp: row.lastLoginIp,
        failedLoginCount: row.failedLoginCount,
        lockedUntil: row.lockedUntil,
        referralCode: row.referralCode,
        referredById: row.referredById,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      new UniqueEntityID(row.id),
    );
  },

  /** Fields eligible for INSERT (id + immutable + initial state). */
  toCreate(user: User): Omit<PrismaUser, 'twoFactorSecret' | 'deletedAt'> {
    const p = user.toPersistenceProps();
    return {
      id: user.id.toString(),
      email: p.email.value,
      emailVerified: p.emailVerified,
      emailVerifiedAt: p.emailVerifiedAt,
      passwordHash: p.passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      phone: p.phone,
      phoneVerified: false,
      country: p.country,
      timezone: p.timezone,
      locale: p.locale,
      status: p.status,
      twoFactorEnabled: p.twoFactorEnabled,
      lastLoginAt: p.lastLoginAt,
      lastLoginIp: p.lastLoginIp,
      failedLoginCount: p.failedLoginCount,
      lockedUntil: p.lockedUntil,
      referralCode: p.referralCode,
      referredById: p.referredById,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  },

  /** Mutable fields eligible for UPDATE. */
  toUpdate(user: User) {
    const p = user.toPersistenceProps();
    return {
      passwordHash: p.passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      phone: p.phone,
      country: p.country,
      timezone: p.timezone,
      locale: p.locale,
      status: p.status,
      emailVerified: p.emailVerified,
      emailVerifiedAt: p.emailVerifiedAt,
      twoFactorEnabled: p.twoFactorEnabled,
      lastLoginAt: p.lastLoginAt,
      lastLoginIp: p.lastLoginIp,
      failedLoginCount: p.failedLoginCount,
      lockedUntil: p.lockedUntil,
      updatedAt: p.updatedAt,
    };
  },
};
