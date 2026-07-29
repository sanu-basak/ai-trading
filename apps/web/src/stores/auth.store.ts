import { create } from 'zustand';
import type { AuthResult, UserProfile } from '@/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  accessToken: string | null;
  setAuth: (result: AuthResult) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: UserProfile) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
  hasPermission: (permission: string) => boolean;
}

/**
 * In-memory auth store. The access token lives only in memory (never in
 * localStorage) — the refresh token is an httpOnly cookie set by the API, so a
 * page reload restores the session via the refresh endpoint.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  user: null,
  accessToken: null,

  setAuth: (result) =>
    set({ user: result.user, accessToken: result.tokens.accessToken, status: 'authenticated' }),
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),

  hasPermission: (permission) => {
    const perms = get().user?.permissions ?? [];
    if (perms.includes('*')) return true;
    if (perms.includes(permission)) return true;
    const [resource] = permission.split(':');
    return perms.includes(`${resource}:*`);
  },
}));
