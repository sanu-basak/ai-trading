import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, ScanResult } from '@/types';

export interface ScanInput {
  watchlistId: string;
  timeframe: string;
  signal?: string;
}

export function useScanWatchlist() {
  return useMutation({
    mutationFn: async (input: ScanInput) => {
      const res = await api.post<ApiSuccess<ScanResult>>('/scanner/watchlist', input);
      return res.data.data;
    },
  });
}
