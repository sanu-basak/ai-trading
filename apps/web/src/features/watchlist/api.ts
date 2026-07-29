import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, Watchlist, WatchlistDetail } from '@/types';

export function useWatchlists() {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<Watchlist[]>>('/watchlists');
      return res.data.data;
    },
  });
}

export function useWatchlistDetail(id: string | null) {
  return useQuery({
    queryKey: ['watchlist', id],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<WatchlistDetail>>(`/watchlists/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<ApiSuccess<Watchlist>>('/watchlists', { name });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  });
}

export function useAddWatchlistItem(watchlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instrumentId: string) => {
      await api.post(`/watchlists/${watchlistId}/items`, { instrumentId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist', watchlistId] });
      qc.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

export function useRemoveWatchlistItem(watchlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instrumentId: string) => {
      await api.delete(`/watchlists/${watchlistId}/items/${instrumentId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist', watchlistId] });
      qc.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}
