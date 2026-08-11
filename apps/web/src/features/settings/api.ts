import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { ApiSuccess, Settings } from '@/types';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<Settings>>('/settings');
      return res.data.data;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Settings>) => {
      const res = await api.put<ApiSuccess<Settings>>('/settings', input);
      return res.data.data;
    },
    onSuccess: (data) => qc.setQueryData(['settings'], data),
  });
}
