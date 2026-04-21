import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminProduct, AdminProductList, AdminProductResponse } from '@/lib/api/admin-types';

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const { data } = await adminApi.get<AdminProductList>(endpoints.adminProducts.list, {
        params: { range: JSON.stringify([0, 999]), sort: JSON.stringify(['id', 'DESC']) },
      });
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useAdminProduct(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'products', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await adminApi.get<AdminProductResponse>(endpoints.adminProducts.byId(id!));
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useAdminProductUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<AdminProduct> & { id: number }) => {
      const { data } = await adminApi.put<AdminProductResponse>(
        endpoints.adminProducts.byId(id),
        payload
      );
      return data.data;
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['admin', 'products', vars.id] });
    },
  });
}
