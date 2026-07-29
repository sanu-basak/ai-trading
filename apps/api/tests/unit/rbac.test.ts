import { describe, it, expect } from 'vitest';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '../../src/shared/infrastructure/security/rbac';

describe('RBAC permission checks', () => {
  it('matches an exact permission', () => {
    expect(hasPermission(['billing:read'], 'billing:read')).toBe(true);
    expect(hasPermission(['billing:read'], 'billing:manage')).toBe(false);
  });

  it('honors a resource wildcard', () => {
    expect(hasPermission(['billing:*'], 'billing:manage')).toBe(true);
    expect(hasPermission(['billing:*'], 'user:read')).toBe(false);
  });

  it('honors the superuser wildcard', () => {
    expect(hasPermission(['*'], 'anything:goes')).toBe(true);
  });

  it('checks all/any correctly', () => {
    const granted = ['watchlist:read', 'watchlist:manage'];
    expect(hasAllPermissions(granted, ['watchlist:read', 'watchlist:manage'])).toBe(true);
    expect(hasAllPermissions(granted, ['watchlist:read', 'user:read'])).toBe(false);
    expect(hasAnyPermission(granted, ['user:read', 'watchlist:read'])).toBe(true);
    expect(hasAnyPermission(granted, ['user:read', 'admin:access'])).toBe(false);
  });
});
