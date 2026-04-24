import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { HomeBanner } from '@/lib/api/types';

export function useHomeBanners() {
  return useQuery({
    queryKey: ['home', 'banners'],
    queryFn: async () => {
      const { data } = await api.get<HomeBanner[]>(endpoints.social.banners);
      return data;
    },
    staleTime: 60_000,
  });
}
