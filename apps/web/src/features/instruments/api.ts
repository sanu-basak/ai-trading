import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, Instrument } from '@/types';

export function useSearchInstruments(query: string, enabled = true) {
  return useQuery({
    queryKey: ['instruments', query],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<Instrument[]>>('/instruments', {
        params: { query: query || undefined, pageSize: 10 },
      });
      return res.data.data;
    },
    enabled,
  });
}

export function useInstrument(id: string | null) {
  return useQuery({
    queryKey: ['instrument', id],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<Instrument>>(`/instruments/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}
