import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { config } from '@/lib/config';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError, ApiSuccess, AuthResult } from '@/types';

/** The API client. `withCredentials` sends the httpOnly refresh cookie. */
export const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request.
api.interceptors.request.use((req: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// --- Single-flight refresh on 401 ---
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Bare axios (no interceptors) to avoid recursion.
    const res = await axios.post<ApiSuccess<AuthResult>>(
      `${config.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const result = res.data.data;
    useAuthStore.getState().setAuth(result);
    return result.tokens.accessToken;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from an Axios/API error. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.error?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Unwraps the standard { success, data } envelope. */
export function unwrap<T>(payload: ApiSuccess<T>): T {
  return payload.data;
}
