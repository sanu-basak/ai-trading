import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, PositionSizeResult, RiskProfile } from '@/types';

export interface PositionSizeInput {
  entry: number;
  stop: number;
  side: 'LONG' | 'SHORT';
  target?: number | null;
  accountSize?: number;
  riskPct?: number;
}

export function useRiskProfile() {
  return useQuery({
    queryKey: ['risk-profile'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<RiskProfile>>('/risk/profile');
      return res.data.data;
    },
  });
}

export function useUpdateRiskProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RiskProfile>) => {
      const res = await api.put<ApiSuccess<RiskProfile>>('/risk/profile', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risk-profile'] }),
  });
}

export function usePositionSize() {
  return useMutation({
    mutationFn: async (input: PositionSizeInput) => {
      const res = await api.post<ApiSuccess<PositionSizeResult>>('/risk/position-size', input);
      return res.data.data;
    },
  });
}
