import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, JournalStats, JournalTrade } from '@/types';

export interface CreateTradeInput {
  instrumentId: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  entryAt: string;
  stopLoss?: number | null;
  target?: number | null;
  fees?: number;
  setup?: string | null;
  notes?: string | null;
  exitPrice?: number | null;
}

export function useJournalTrades(status?: string) {
  return useQuery({
    queryKey: ['journal-trades', status ?? 'all'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<JournalTrade[]>>('/journal', {
        params: { status, pageSize: 100 },
      });
      return res.data.data;
    },
  });
}

export function useJournalStats() {
  return useQuery({
    queryKey: ['journal-stats'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<JournalStats>>('/journal/stats');
      return res.data.data;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>): void {
  qc.invalidateQueries({ queryKey: ['journal-trades'] });
  qc.invalidateQueries({ queryKey: ['journal-stats'] });
}

export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTradeInput) => {
      const res = await api.post<ApiSuccess<JournalTrade>>('/journal', input);
      return res.data.data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useCloseTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, exitPrice }: { id: string; exitPrice: number }) => {
      const res = await api.post<ApiSuccess<JournalTrade>>(`/journal/${id}/close`, { exitPrice });
      return res.data.data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/journal/${id}`);
    },
    onSuccess: () => invalidate(qc),
  });
}
