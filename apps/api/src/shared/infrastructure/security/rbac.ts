/**
 * Pure RBAC helpers. Wildcards are supported at the resource level:
 *  - "*"            → superuser, all permissions
 *  - "billing:*"    → all actions on the billing resource
 *  - "billing:read" → a specific action
 */
export const SUPERUSER_PERMISSION = '*';

export function hasPermission(granted: string[], required: string): boolean {
  if (granted.includes(SUPERUSER_PERMISSION)) return true;
  if (granted.includes(required)) return true;

  const [resource] = required.split(':');
  return granted.includes(`${resource}:*`);
}

export function hasAllPermissions(granted: string[], required: string[]): boolean {
  return required.every((p) => hasPermission(granted, p));
}

export function hasAnyPermission(granted: string[], required: string[]): boolean {
  return required.some((p) => hasPermission(granted, p));
}

export function hasRole(userRoles: string[], role: string): boolean {
  return userRoles.includes(role);
}
