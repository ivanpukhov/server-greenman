import axios, { AxiosError, AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth.store';

const DEFAULT_BASE = 'https://greenman.kz/api';

function resolveBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;
}

export const api: AxiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const { logout, isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        await logout();
      }
    }
    return Promise.reject(error);
  }
);

export const adminApi: AxiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().adminToken;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      const { adminLogout, isAdmin } = useAuthStore.getState();
      if (isAdmin) {
        await adminLogout();
      }
    }
    return Promise.reject(error);
  }
);

export function getApiBaseUrl(): string {
  return resolveBaseUrl();
}
