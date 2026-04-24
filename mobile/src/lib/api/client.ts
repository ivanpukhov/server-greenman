import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth.store';

const DEFAULT_BASE = 'https://greenman.kz/api';

function resolveBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;
}

function mediaHost(): string {
  return resolveBaseUrl().replace(/\/api\/?$/, '').replace(/\/$/, '');
}

function rewriteRelativeMediaUrls(data: unknown, host: string): unknown {
  if (data == null) return data;
  if (typeof data === 'string') {
    return data.startsWith('/uploads/') ? `${host}${data}` : data;
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i += 1) data[i] = rewriteRelativeMediaUrls(data[i], host);
    return data;
  }
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of Object.keys(o)) o[k] = rewriteRelativeMediaUrls(o[k], host);
    return o;
  }
  return data;
}

function absolutizeMedia(res: AxiosResponse): AxiosResponse {
  const host = mediaHost();
  if (host) rewriteRelativeMediaUrls(res.data, host);
  return res;
}

export const api: AxiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 20000,
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
  (res) => absolutizeMedia(res),
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
  (res) => absolutizeMedia(res),
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
