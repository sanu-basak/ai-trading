import type { User } from '../../auth/domain/entities/user.entity';

export interface UserSummaryDto {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function toUserSummary(user: User): UserSummaryDto {
  const p = user.toPersistenceProps();
  return {
    id: user.id.toString(),
    email: p.email.value,
    displayName: p.displayName,
    status: p.status,
    emailVerified: p.emailVerified,
    lastLoginAt: p.lastLoginAt ? p.lastLoginAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}
