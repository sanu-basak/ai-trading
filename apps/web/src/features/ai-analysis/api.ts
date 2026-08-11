import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, MtfResult, Signal, SmcResult } from '@/types';

interface AnalyzeInput {
  instrumentId: string;
  timeframe: string;
}

export function useAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AnalyzeInput) => {
      const res = await api.post<ApiSuccess<Signal>>('/ai/analyze', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signals'] }),
  });
}

export function useAnalyzeMtf() {
  return useMutation({
    mutationFn: async (input: { instrumentId: string; timeframes?: string[] }) => {
      const res = await api.post<ApiSuccess<MtfResult>>('/ai/analyze-mtf', input);
      return res.data.data;
    },
  });
}

export function useSmc() {
  return useMutation({
    mutationFn: async (input: { instrumentId: string; timeframe: string }) => {
      const res = await api.post<ApiSuccess<SmcResult>>('/ai/smc', input);
      return res.data.data;
    },
  });
}

export function useSignals() {
  return useQuery({
    queryKey: ['signals'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<Signal[]>>('/ai/signals', { params: { pageSize: 20 } });
      return res.data.data;
    },
  });
}
