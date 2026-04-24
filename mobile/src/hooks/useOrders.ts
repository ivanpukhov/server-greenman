import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Order, OrderProfile } from '@/lib/api/types';
import { useAuthStore } from '@/stores/auth.store';
import type { ProfileResponse } from '@/hooks/useProfile';

export function useMyOrders() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['orders', 'user', userId],
    enabled: !!userId,
    queryFn: async () => {
      // /profile returns orders owned by userId (KZ + RF) — matches the website.
      // The /orders/user-orders endpoint reads req.user.id which is undefined in
      // the JWT payload, so it returns empty for mobile clients.
      const { data } = await api.get<ProfileResponse>(endpoints.profile.me);
      return data.orders ?? [];
    },
    staleTime: 30 * 1000,
  });
}

export function useOrder(id: number | string | undefined) {
  const numericId = typeof id === 'string' ? Number(id) : id;
  return useQuery({
    queryKey: ['order', numericId],
    enabled: Number.isFinite(numericId) && numericId! > 0,
    queryFn: async () => {
      const { data } = await api.get<Order>(endpoints.orders.byId(numericId!));
      return data;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<Order>(endpoints.orders.create, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useOrderProfiles() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['orderProfiles', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await api.get<OrderProfile[]>(endpoints.orderProfiles.byUser(userId!));
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteOrderProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoints.orderProfiles.remove(id));
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orderProfiles'] });
    },
  });
}

export function useUpsertOrderProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<OrderProfile> & { id?: number }) => {
      if (payload.id) {
        const { data } = await api.put<OrderProfile>(
          endpoints.orderProfiles.update(payload.id),
          payload
        );
        return data;
      }
      const { data } = await api.post<OrderProfile>(endpoints.orderProfiles.create, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orderProfiles'] });
    },
  });
}
