const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const config = {
  apiUrl,
  /** Socket.io connects to the API origin (strip the /api/v1 path). */
  wsUrl: apiUrl.replace(/\/api\/v1\/?$/, ''),
} as const;

export const DISCLAIMER =
  'Analysis and education only — not investment advice. No outcome is guaranteed. ' +
  'Trading involves substantial risk of loss.';
