import { getApiBaseUrl } from '@/lib/api/client';

function mediaHost(): string {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

export function resolveMediaUrl(url: string): string;
export function resolveMediaUrl(url: string | null | undefined): string | null;
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${mediaHost()}${url}`;
  return `${mediaHost()}/${url}`;
}
