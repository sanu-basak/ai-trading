import { AggregateRoot, Result, UniqueEntityID } from '../../../../shared/domain';
import { Email } from '../value-objects/email.vo';
import {
  EmailVerifiedEvent,
  PasswordChangedEvent,
  UserLoggedInEvent,
  UserRegisteredEvent,
} from '../events/auth-events';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export interface UserProps {
  email: Email;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  country: string | null;
  timezone: string;
  locale: string;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  referralCode: string;
  referredById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: Email;
  passwordHash: string | null;
  firstName?: string | null;
  lastName?: string | null;
  referralCode: string;
  referredById?: string | null;
  timezone?: string;
  locale?: string;
}

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * The User aggregate root. Encapsulates credential state, account status, and
 * the login-security invariants (lockout after repeated failures). Roles and
 * permissions live in the authorization context and are joined at read time.
 */
export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(props, id);
  }

  // --- Accessors ---
  get email(): Email {
    return this.props.email;
  }
  get passwordHash(): string | null {
    return this.props.passwordHash;
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get emailVerified(): boolean {
    return this.props.emailVerified;
  }
  get firstName(): string | null {
    return this.props.firstName;
  }
  get lastName(): string | null {
    return this.props.lastName;
  }
  get displayName(): string | null {
    return this.props.displayName;
  }
  get referralCode(): string {
    return this.props.referralCode;
  }
  get props_(): Readonly<UserProps> {
    return this.props;
  }

  // --- Factory: new registration ---
  static create(input: CreateUserInput): Result<User, string> {
    const now = new Date();
    const user = new User({
      email: input.email,
      passwordHash: input.passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      displayName: input.firstName ? `${input.firstName} ${input.lastName ?? ''}`.trim() : null,
      avatarUrl: null,
      phone: null,
      country: null,
      timezone: input.timezone ?? 'Asia/Kolkata',
      locale: input.locale ?? 'en',
      status: 'PENDING',
      emailVerified: false,
      emailVerifiedAt: null,
      twoFactorEnabled: false,
      lastLoginAt: null,
      lastLoginIp: null,
      failedLoginCount: 0,
      lockedUntil: null,
      referralCode: input.referralCode,
      referredById: input.referredById ?? null,
      createdAt: now,
      updatedAt: now,
    });
    user.addDomainEvent(new UserRegisteredEvent(user.id, input.email.value));
    return Result.ok(user);
  }

  // --- Factory: rehydrate from persistence ---
  static reconstitute(props: UserProps, id: UniqueEntityID): User {
    return new User(props, id);
  }

  // --- Behaviour / invariants ---
  isLocked(now: Date = new Date()): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now;
  }

  canLogin(): { ok: boolean; reason?: string } {
    if (this.props.status === 'BANNED') return { ok: false, reason: 'account_banned' };
    if (this.props.status === 'SUSPENDED') return { ok: false, reason: 'account_suspended' };
    if (this.props.status === 'DELETED') return { ok: false, reason: 'account_deleted' };
    if (this.isLocked()) return { ok: false, reason: 'account_locked' };
    return { ok: true };
  }

  hasPassword(): boolean {
    return this.props.passwordHash !== null;
  }

  recordSuccessfulLogin(ip?: string): void {
    const now = new Date();
    this.props.lastLoginAt = now;
    this.props.lastLoginIp = ip ?? null;
    this.props.failedLoginCount = 0;
    this.props.lockedUntil = null;
    if (this.props.status === 'PENDING' && this.props.emailVerified) {
      this.props.status = 'ACTIVE';
    }
    this.props.updatedAt = now;
    this.addDomainEvent(new UserLoggedInEvent(this.id, ip));
  }

  recordFailedLogin(): void {
    this.props.failedLoginCount += 1;
    if (this.props.failedLoginCount >= MAX_FAILED_LOGINS) {
      this.props.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    this.props.updatedAt = new Date();
  }

  verifyEmail(): void {
    if (this.props.emailVerified) return;
    this.props.emailVerified = true;
    this.props.emailVerifiedAt = new Date();
    if (this.props.status === 'PENDING') {
      this.props.status = 'ACTIVE';
    }
    this.props.updatedAt = new Date();
    this.addDomainEvent(new EmailVerifiedEvent(this.id));
  }

  changePassword(newHash: string): void {
    this.props.passwordHash = newHash;
    this.props.failedLoginCount = 0;
    this.props.lockedUntil = null;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new PasswordChangedEvent(this.id));
  }

  updateProfile(input: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    country?: string | null;
    timezone?: string;
    locale?: string;
  }): void {
    const p = this.props;
    if (input.firstName !== undefined) p.firstName = input.firstName;
    if (input.lastName !== undefined) p.lastName = input.lastName;
    if (input.displayName !== undefined) p.displayName = input.displayName;
    if (input.avatarUrl !== undefined) p.avatarUrl = input.avatarUrl;
    if (input.phone !== undefined) p.phone = input.phone;
    if (input.country !== undefined) p.country = input.country;
    if (input.timezone !== undefined) p.timezone = input.timezone;
    if (input.locale !== undefined) p.locale = input.locale;
    p.updatedAt = new Date();
  }

  setStatus(status: UserStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  /** Snapshot for the persistence mapper. */
  toPersistenceProps(): Readonly<UserProps> {
    return this.props;
  }
}
