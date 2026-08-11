import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Alert, AlertOperator, ApiSuccess } from '@/types';

export interface CreateAlertInput {
  instrumentId: string;
  name: string;
  operator: AlertOperator;
  value: number;
  isRepeating?: boolean;
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<Alert[]>>('/alerts');
      return res.data.data;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>): void {
  qc.invalidateQueries({ queryKey: ['alerts'] });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      const res = await api.post<ApiSuccess<Alert>>('/alerts', input);
      return res.data.data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useSetAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'pause' | 'resume' }) => {
      await api.patch(`/alerts/${id}/status`, { action });
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/alerts/${id}`);
    },
    onSuccess: () => invalidate(qc),
  });
}
