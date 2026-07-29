import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiSuccess, AuthResult } from '@/types';

interface LoginInput {
  email: string;
  password: string;
}
interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.post<ApiSuccess<AuthResult>>('/auth/login', input);
      return unwrap(res.data);
    },
    onSuccess: (result) => setAuth(result),
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await api.post<ApiSuccess<AuthResult>>('/auth/register', input);
      return unwrap(res.data);
    },
    onSuccess: (result) => setAuth(result),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', {});
    },
    onSettled: () => clear(),
  });
}

/**
 * On first load, attempt to restore the session from the httpOnly refresh
 * cookie. Sets the auth status to authenticated/unauthenticated accordingly.
 */
export function useAuthBootstrap() {
  const setStatus = useAuthStore((s) => s.setStatus);
  const setAuth = useAuthStore((s) => s.setAuth);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== 'idle') return;
    setStatus('loading');
    api
      .post<ApiSuccess<AuthResult>>('/auth/refresh', {})
      .then((res) => setAuth(unwrap(res.data)))
      .catch(() => setStatus('unauthenticated'));
  }, [status, setStatus, setAuth]);
}
