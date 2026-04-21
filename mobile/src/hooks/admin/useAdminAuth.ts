import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAuthStore, type AdminProfile } from '@/stores/auth.store';

type RequestCodeResponse = { message: string; phoneMask: string };

type ConfirmCodeResponse = {
  token: string;
  user: {
    id: number;
    phoneNumber: string;
    iin: string;
    role: 'admin';
    fullName: string;
  };
};

export function useAdminRequestCode() {
  return useMutation({
    mutationFn: async (iin: string) => {
      const { data } = await adminApi.post<RequestCodeResponse>(
        endpoints.adminAuth.requestCode,
        { iin }
      );
      return data;
    },
  });
}

export function useAdminConfirmCode() {
  const adminLogin = useAuthStore((s) => s.adminLogin);
  return useMutation({
    mutationFn: async ({ iin, code }: { iin: string; code: string }) => {
      const { data } = await adminApi.post<ConfirmCodeResponse>(
        endpoints.adminAuth.confirmCode,
        { iin, confirmationCode: code }
      );
      return data;
    },
    onSuccess: async (data) => {
      const profile: AdminProfile = {
        fullName: data.user.fullName,
        iin: data.user.iin,
        phoneNumber: data.user.phoneNumber,
      };
      await adminLogin({ token: data.token, userId: data.user.id, profile });
    },
  });
}
