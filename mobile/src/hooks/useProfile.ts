import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Order, OrderProfile, ProfileUser } from '@/lib/api/types';
import { useAuthStore } from '@/stores/auth.store';

export type ProfileResponse = {
  user: ProfileUser;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  requiresProfile: boolean;
  orderProfiles: OrderProfile[];
  orders: Order[];
};

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateLocalProfile = useAuthStore((s) => s.updateUserProfile);

  return useQuery({
    queryKey: ['profile', 'me'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>(endpoints.profile.me);
      if (data.user?.firstName && data.user?.lastName) {
        await updateLocalProfile({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
        });
      }
      return data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const updateLocalProfile = useAuthStore((s) => s.updateUserProfile);

  return useMutation({
    mutationFn: async (payload: { firstName: string; lastName: string }) => {
      const { data } = await api.patch<ProfileUser>(endpoints.profile.update, payload);
      return data;
    },
    onSuccess: async (data) => {
      if (data.firstName && data.lastName) {
        await updateLocalProfile({ firstName: data.firstName, lastName: data.lastName });
      }
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      await api.delete(endpoints.profile.remove);
    },
    onSuccess: async () => {
      qc.clear();
      await logout();
    },
  });
}
