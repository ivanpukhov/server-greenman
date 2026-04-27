const rawApiHost = (import.meta.env.VITE_API_HOST || 'https://greenman.kz').trim().replace(/\/+$/, '');
const normalizedApiHost = rawApiHost.endsWith('/api') ? rawApiHost.slice(0, -4) : rawApiHost;

export const apiBaseUrl = normalizedApiHost ? `${normalizedApiHost}/api` : '/api';

export const apiUrl = (path = '') => {
    if (!path) {
        return apiBaseUrl;
    }

    return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export const publicAssetUrl = (url = '') => {
    const safeUrl = String(url || '').trim();

    if (!safeUrl || /^(https?:)?\/\//i.test(safeUrl) || safeUrl.startsWith('data:') || safeUrl.startsWith('blob:')) {
        return safeUrl;
    }

    if (safeUrl.startsWith('/uploads/')) {
        return `${normalizedApiHost}${safeUrl}`;
    }

    return safeUrl;
};
