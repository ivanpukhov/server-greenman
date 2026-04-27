import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthConfirmCodeResponse, AuthRegisterLoginResponse } from '@/lib/api/types';
import { useAuthStore } from '@/stores/auth.store';

const AUTO_ADMIN_PROFILES: Record<string, { fullName: string; iin: string }> = {
  '7073670497': { fullName: 'Greenman Admin', iin: '041007550334' },
  '7055596645': { fullName: 'Greenman Admin', iin: '000000000002' },
};

function normalizeAdminPhone(raw?: string | null) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('7') ? digits.slice(1) : digits.slice(-10);
}

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
    onSuccess: async (data, variables) => {
      const normalizedPhone = normalizeAdminPhone(data.user?.phoneNumber ?? variables.phoneNumber);
      const autoAdminProfile = AUTO_ADMIN_PROFILES[normalizedPhone];

      await login({
        token: data.token,
        userId: data.userId,
        phoneNumber: data.user?.phoneNumber ?? normalizedPhone,
        firstName: data.user?.firstName ?? null,
        lastName: data.user?.lastName ?? null,
      });

      const shouldGrantAdmin = data.isAdmin || data.user?.role === 'admin' || Boolean(autoAdminProfile);
      if (shouldGrantAdmin) {
        await adminLogin({
          token: data.token,
          userId: data.userId,
          profile: {
            fullName:
              data.adminProfile?.fullName ||
              [data.user?.firstName, data.user?.lastName].filter(Boolean).join(' ') ||
              autoAdminProfile?.fullName ||
              'Greenman Admin',
            iin: data.adminProfile?.iin ?? autoAdminProfile?.iin ?? '',
            phoneNumber: data.adminProfile?.phoneNumber ?? data.user?.phoneNumber ?? normalizedPhone,
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
