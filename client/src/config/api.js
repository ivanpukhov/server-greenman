const rawApiHost = (import.meta.env.VITE_API_HOST || '').trim().replace(/\/+$/, '');
const normalizedApiHost = rawApiHost.endsWith('/api') ? rawApiHost.slice(0, -4) : rawApiHost;

export const apiBaseUrl = normalizedApiHost ? `${normalizedApiHost}/api` : '/api';

export const apiUrl = (path = '') => {
    if (!path) {
        return apiBaseUrl;
    }

    return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};
