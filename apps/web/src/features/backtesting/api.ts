import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, BacktestResult } from '@/types';

export interface BacktestInput {
  instrumentId: string;
  timeframe: string;
  strategy: string;
  initialCapital?: number;
  commissionBps?: number;
}

export function useBacktest() {
  return useMutation({
    mutationFn: async (input: BacktestInput) => {
      const res = await api.post<ApiSuccess<BacktestResult>>('/ai/backtest', input);
      return res.data.data;
    },
  });
}
