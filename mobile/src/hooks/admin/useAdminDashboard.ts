import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export type AdminStats = {
  posts: { total: number; draft: number };
  articles: { total: number; draft: number };
  reels: { total: number; draft: number };
  webinars: { total: number; draft: number };
  courses: { total: number; draft: number };
  stories: { total: number };
  banners: { total: number };
  enrollments: { total: number; active: number };
  comments: { total: number };
  media: { total: number };
};

export type DraftKind = 'post' | 'article' | 'reel' | 'webinar' | 'course';

export type DraftItem = {
  kind: DraftKind;
  id: number;
  title: string;
  updatedAt: string;
};

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'social', 'stats'],
    queryFn: async () => {
      const { data } = await adminApi.get<AdminStats>(endpoints.adminSocial.stats);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAdminDrafts(limit = 8) {
  return useQuery({
    queryKey: ['admin', 'social', 'drafts', limit],
    queryFn: async () => {
      const { data } = await adminApi.get<{ items: DraftItem[] }>(endpoints.adminSocial.drafts, {
        params: { limit },
      });
      return data.items ?? [];
    },
    staleTime: 30_000,
  });
}
