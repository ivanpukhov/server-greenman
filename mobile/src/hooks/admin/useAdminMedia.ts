import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Media, MediaKind } from '@/lib/api/admin-types';

type ListParams = { type?: MediaKind; limit?: number };

export function useAdminMediaList(params: ListParams = {}) {
  return useQuery({
    queryKey: ['admin', 'media', params],
    queryFn: async () => {
      const { data } = await adminApi.get<Media[]>(endpoints.adminSocial.media, { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export type UploadInput = {
  uri: string;
  name: string;
  mimeType: string;
  onProgress?: (fraction: number) => void;
};

export function useAdminMediaUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uri, name, mimeType, onProgress }: UploadInput) => {
      const form = new FormData();
      form.append('file', {
        uri,
        name,
        type: mimeType,
      } as unknown as Blob);

      const { data } = await adminApi.post<Media>(endpoints.adminSocial.media, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: (e) => {
          if (!onProgress || !e.total) return;
          onProgress(e.loaded / e.total);
        },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
  });
}

export function useAdminMediaDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(endpoints.adminSocial.mediaById(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
  });
}
