import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  AdminComment,
  Article,
  Course,
  CourseDay,
  Post,
  Reel,
  Story,
  Webinar,
} from '@/lib/api/admin-types';

function makeCrud<T extends { id: number }>(
  key: string,
  listUrl: string,
  byId: (id: number) => string,
  options: { hasGet?: boolean } = {}
) {
  const useList = () =>
    useQuery({
      queryKey: ['admin', key],
      queryFn: async () => {
        const { data } = await adminApi.get<T[]>(listUrl);
        return data;
      },
      staleTime: 30_000,
    });

  const useOne = (id: number | null) =>
    useQuery({
      queryKey: ['admin', key, id],
      enabled: !!id && options.hasGet !== false,
      queryFn: async () => {
        const { data } = await adminApi.get<T>(byId(id!));
        return data;
      },
      staleTime: 30_000,
    });

  const useCreate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (payload: Partial<T>) => {
        const { data } = await adminApi.post<T>(listUrl, payload);
        return data;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', key] }),
    });
  };

  const useUpdate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, ...payload }: Partial<T> & { id: number }) => {
        const { data } = await adminApi.patch<T>(byId(id), payload);
        return data;
      },
      onSuccess: (_res, vars) => {
        qc.invalidateQueries({ queryKey: ['admin', key] });
        qc.invalidateQueries({ queryKey: ['admin', key, vars.id] });
      },
    });
  };

  const useRemove = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: number) => {
        await adminApi.delete(byId(id));
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', key] }),
    });
  };

  return { useList, useOne, useCreate, useUpdate, useRemove };
}

export const posts = makeCrud<Post>(
  'posts',
  endpoints.adminSocial.posts,
  endpoints.adminSocial.postById,
  { hasGet: false }
);

export const stories = makeCrud<Story>(
  'stories',
  endpoints.adminSocial.stories,
  endpoints.adminSocial.storyById,
  { hasGet: false }
);

export const reels = makeCrud<Reel>(
  'reels',
  endpoints.adminSocial.reels,
  endpoints.adminSocial.reelById,
  { hasGet: false }
);

export const articles = makeCrud<Article>(
  'articles',
  endpoints.adminSocial.articles,
  endpoints.adminSocial.articleById,
  { hasGet: true }
);

export const webinars = makeCrud<Webinar>(
  'webinars',
  endpoints.adminSocial.webinars,
  endpoints.adminSocial.webinarById,
  { hasGet: true }
);

export const courses = makeCrud<Course>(
  'courses',
  endpoints.adminSocial.courses,
  endpoints.adminSocial.courseById,
  { hasGet: true }
);

export function useAdminCourseDays(courseId: number | null) {
  return useQuery({
    queryKey: ['admin', 'courses', courseId, 'days'],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await adminApi.get<CourseDay[]>(endpoints.adminSocial.courseDays(courseId!));
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAdminCourseDayCreate(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CourseDay>) => {
      const { data } = await adminApi.post<CourseDay>(
        endpoints.adminSocial.courseDays(courseId),
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'days'] }),
  });
}

export function useAdminCourseDayUpdate(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CourseDay> & { id: number }) => {
      const { data } = await adminApi.patch<CourseDay>(
        endpoints.adminSocial.courseDayById(courseId, id),
        payload
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'days'] }),
  });
}

export function useAdminCourseDayRemove(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(endpoints.adminSocial.courseDayById(courseId, id));
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'days'] }),
  });
}

type CommentType = 'post' | 'reel' | 'article' | 'webinar' | 'course_day';

export function useAdminComments(type?: CommentType) {
  return useQuery({
    queryKey: ['admin', 'comments', type ?? 'all'],
    queryFn: async () => {
      const { data } = await adminApi.get<AdminComment[]>(endpoints.adminSocial.comments, {
        params: type ? { type } : {},
      });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAdminCommentRemove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(endpoints.adminSocial.commentById(id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'comments'] }),
  });
}
