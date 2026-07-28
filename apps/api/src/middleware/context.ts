import { AsyncLocalStorage } from 'node:async_hooks';

/** The authenticated principal attached to a request after `authenticate`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

/** Ambient per-request context available anywhere via AsyncLocalStorage. */
export interface RequestContext {
  requestId: string;
  user?: AuthenticatedUser;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getCurrentUser(): AuthenticatedUser | undefined {
  return requestContextStorage.getStore()?.user;
}

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}
