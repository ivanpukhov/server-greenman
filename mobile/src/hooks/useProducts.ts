import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Product, ProductReviewsResponse } from '@/lib/api/types';

export type SearchType = 'name' | 'disease';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get<Product[]>(endpoints.products.list);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(id: number | string | undefined) {
  const numericId = typeof id === 'string' ? Number(id) : id;
  return useQuery({
    queryKey: ['product', numericId],
    enabled: Number.isFinite(numericId) && numericId! > 0,
    queryFn: async () => {
      const { data } = await api.get<Product>(endpoints.products.byId(numericId!));
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useSearchProducts(type: SearchType, query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['products', 'search', type, trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const { data } = await api.get<Product[]>(endpoints.products.search(trimmed), {
        params: { type },
      });
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useProductReviews(productId: number | string | undefined) {
  const numericId = typeof productId === 'string' ? Number(productId) : productId;
  return useQuery({
    queryKey: ['product', numericId, 'reviews'],
    enabled: Number.isFinite(numericId) && numericId! > 0,
    queryFn: async () => {
      const { data } = await api.get<ProductReviewsResponse>(endpoints.products.reviews(numericId!));
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateProductReview(productId: number | string | undefined) {
  const qc = useQueryClient();
  const numericId = typeof productId === 'string' ? Number(productId) : productId;
  return useMutation({
    mutationFn: async (payload: { rating: number; body?: string }) => {
      if (!numericId) throw new Error('productId is required');
      const { data } = await api.post(endpoints.products.reviews(numericId), payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', numericId] });
      qc.invalidateQueries({ queryKey: ['product', numericId, 'reviews'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
