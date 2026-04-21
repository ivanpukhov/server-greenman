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
  return useMutation({
    mutationFn: async ({ phoneNumber, code }: { phoneNumber: string; code: string }) => {
      const { data } = await api.post<AuthConfirmCodeResponse>(
        endpoints.auth.confirmCode,
        { phoneNumber, confirmationCode: code }
      );
      return data;
    },
    onSuccess: async (data) => {
      await login({ token: data.token, userId: data.userId });
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
