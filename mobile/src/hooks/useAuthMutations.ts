import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthConfirmCodeResponse, AuthRegisterLoginResponse } from '@/lib/api/types';
import { useAuthStore } from '@/stores/auth.store';

export function useRegisterLogin() {
  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      const { data } = await api.post<AuthRegisterLoginResponse>(
        endpoints.auth.registerLogin,
        { phoneNumber }
      );
      return data;
    },
  });
}

export function useConfirmCode() {
  const login = useAuthStore((s) => s.login);
  const adminLogin = useAuthStore((s) => s.adminLogin);
  return useMutation({
    mutationFn: async ({ phoneNumber, code }: { phoneNumber: string; code: string }) => {
      const { data } = await api.post<AuthConfirmCodeResponse>(
        endpoints.auth.confirmCode,
        { phoneNumber, confirmationCode: code }
      );
      return data;
    },
    onSuccess: async (data) => {
      await login({
        token: data.token,
        userId: data.userId,
        firstName: data.user?.firstName ?? null,
        lastName: data.user?.lastName ?? null,
      });
      const shouldGrantAdmin = data.isAdmin || data.user?.role === 'admin';
      if (shouldGrantAdmin) {
        await adminLogin({
          token: data.token,
          userId: data.userId,
          profile: {
            fullName:
              data.adminProfile?.fullName ||
              [data.user?.firstName, data.user?.lastName].filter(Boolean).join(' ') ||
              'Greenman Admin',
            iin: data.adminProfile?.iin ?? '',
            phoneNumber: data.adminProfile?.phoneNumber ?? data.user?.phoneNumber ?? '',
          },
        });
      }
    },
  });
}

export function useResendCode() {
  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      await api.post(endpoints.auth.resendCode, { phoneNumber });
    },
  });
}
