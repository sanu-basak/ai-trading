import type { User } from '../../domain/entities/user.entity';
import type { AccessControl } from '../../domain/repositories/user.repository';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // access-token lifetime in seconds
}

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  timezone: string;
  locale: string;
  referralCode: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
}

export interface AuthResultDto {
  user: UserProfileDto;
  tokens: AuthTokens;
}

/** Builds the client-facing profile DTO from the aggregate + access control. */
export function toUserProfile(user: User, access: AccessControl): UserProfileDto {
  const p = user.toPersistenceProps();
  return {
    id: user.id.toString(),
    email: p.email.value,
    firstName: p.firstName,
    lastName: p.lastName,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    status: p.status,
    emailVerified: p.emailVerified,
    twoFactorEnabled: p.twoFactorEnabled,
    timezone: p.timezone,
    locale: p.locale,
    referralCode: p.referralCode,
    roles: access.roles,
    permissions: access.permissions,
    createdAt: p.createdAt.toISOString(),
  };
}
