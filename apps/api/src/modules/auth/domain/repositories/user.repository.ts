import type { Page, PageRequest } from '../../../../shared/domain';
import type { User, UserStatus } from '../entities/user.entity';

/** The user's effective roles and flattened permissions for token issuance. */
export interface AccessControl {
  roles: string[];
  permissions: string[];
}

export interface UserListFilter extends PageRequest {
  status?: UserStatus;
  search?: string;
}

/** Persistence contract for the User aggregate (implemented in infrastructure). */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;

  /** Persists a brand-new user and assigns the given role atomically. */
  createWithRole(user: User, roleName: string): Promise<void>;

  /** Persists mutations to an existing user aggregate. */
  save(user: User): Promise<void>;

  /** Resolves the user's roles and flattened permission keys. */
  getAccessControl(userId: string): Promise<AccessControl>;

  list(filter: UserListFilter): Promise<Page<User>>;
}
