import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, PaperAccount, PaperAccountDetail, PlaceOrderResult } from '@/types';

export function usePaperAccounts() {
  return useQuery({
    queryKey: ['paper-accounts'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PaperAccount[]>>('/paper/accounts');
      return res.data.data;
    },
  });
}

export function usePaperAccount(id: string | null) {
  return useQuery({
    queryKey: ['paper-account', id],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PaperAccountDetail>>(`/paper/accounts/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePaperAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; startingCapital: number }) => {
      const res = await api.post<ApiSuccess<PaperAccount>>('/paper/accounts', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paper-accounts'] }),
  });
}

export interface PlaceOrderInput {
  instrumentId: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  limitPrice?: number;
}

export function usePlaceOrder(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlaceOrderInput) => {
      const res = await api.post<ApiSuccess<PlaceOrderResult>>(
        `/paper/accounts/${accountId}/orders`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paper-account', accountId] });
      qc.invalidateQueries({ queryKey: ['paper-accounts'] });
    },
  });
}
