import { apiBaseUrl } from '../config/api';

const USER_TOKEN_KEY = 'token';
const ADMIN_TOKEN_KEY = 'adminToken';

function getUserToken() {
    return localStorage.getItem(USER_TOKEN_KEY);
}

function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = 'user', isFormData = false, query } = {}) {
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    const token = auth === 'admin' ? getAdminToken() : getUserToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let url = `${apiBaseUrl}${path}`;
    if (query) {
        const qs = new URLSearchParams(
            Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
        ).toString();
        if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
        method,
        headers,
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
    });
    const text = await res.text();
    const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (!res.ok) {
        const err = new Error(json?.message || res.statusText);
        err.status = res.status;
        err.payload = json;
        throw err;
    }
    return json;
}

export const socialApi = {
    feed: (query) => request('/social/feed', { query, auth: 'user' }),
    posts: {
        list: (query) => request('/social/posts', { query }),
        get: (id) => request(`/social/posts/${id}`)
    },
    reels: {
        list: (query) => request('/social/reels', { query }),
        get: (id) => request(`/social/reels/${id}`),
        view: (id) => request(`/social/reels/${id}/view`, { method: 'POST' })
    },
    stories: {
        active: () => request('/social/stories/active'),
        view: (id) => request(`/social/stories/${id}/view`, { method: 'POST' })
    },
    articles: {
        list: (query) => request('/social/articles', { query }),
        get: (slug) => request(`/social/articles/${slug}`)
    },
    webinars: {
        list: () => request('/social/webinars'),
        get: (slug) => request(`/social/webinars/${slug}`)
    },
    polls: {
        vote: (id, optionIds) => request(`/social/polls/${id}/vote`, { method: 'POST', body: { optionIds } })
    },
    courses: {
        list: () => request('/social/courses'),
        get: (slug) => request(`/social/courses/${slug}`, { auth: 'user' }),
        enroll: (id) => request(`/social/courses/${id}/enroll`, { method: 'POST' }),
        days: (slug) => request(`/social/courses/${slug}/days`, { auth: 'user' }),
        day: (slug, n) => request(`/social/courses/${slug}/days/${n}`),
        mine: () => request('/social/courses/mine'),
        submitReport: (enrollmentId, body) => request(`/social/courses/enrollments/${enrollmentId}/reports`, { method: 'POST', body }),
        supportList: (enrollmentId) => request(`/social/courses/enrollments/${enrollmentId}/support`),
        supportSend: (enrollmentId, body) => request(`/social/courses/enrollments/${enrollmentId}/support`, { method: 'POST', body })
    },
    comments: {
        list: (type, id) => request('/social/comments', { query: { type, id } }),
        create: (type, id, body, parentCommentId) => request('/social/comments', { method: 'POST', body: { type, id, body, parentCommentId } }),
        remove: (id) => request(`/social/comments/${id}`, { method: 'DELETE' })
    },
    reactions: {
        counts: (type, id) => request('/social/reactions', { query: { type, id } }),
        toggle: (type, id, reaction) => request('/social/reactions/toggle', { method: 'POST', body: { type, id, reaction } })
    }
};

export const adminSocialApi = {
    uploadMedia: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return request('/admin/social/media', { method: 'POST', body: fd, isFormData: true, auth: 'admin' });
    },
    listMedia: (query) => request('/admin/social/media', { query, auth: 'admin' }),
    deleteMedia: (id) => request(`/admin/social/media/${id}`, { method: 'DELETE', auth: 'admin' }),

    posts: {
        list: () => request('/admin/social/posts', { auth: 'admin' }),
        create: (body) => request('/admin/social/posts', { method: 'POST', body, auth: 'admin' }),
        update: (id, body) => request(`/admin/social/posts/${id}`, { method: 'PATCH', body, auth: 'admin' }),
        remove: (id) => request(`/admin/social/posts/${id}`, { method: 'DELETE', auth: 'admin' })
    },
    reels: {
        list: () => request('/admin/social/reels', { auth: 'admin' }),
        create: (body) => request('/admin/social/reels', { method: 'POST', body, auth: 'admin' }),
        update: (id, body) => request(`/admin/social/reels/${id}`, { method: 'PATCH', body, auth: 'admin' }),
        remove: (id) => request(`/admin/social/reels/${id}`, { method: 'DELETE', auth: 'admin' })
    },
    stories: {
        list: () => request('/admin/social/stories', { auth: 'admin' }),
        create: (body) => request('/admin/social/stories', { method: 'POST', body, auth: 'admin' }),
        update: (id, body) => request(`/admin/social/stories/${id}`, { method: 'PATCH', body, auth: 'admin' }),
        remove: (id) => request(`/admin/social/stories/${id}`, { method: 'DELETE', auth: 'admin' })
    },
    articles: {
        list: () => request('/admin/social/articles', { auth: 'admin' }),
        get: (id) => request(`/admin/social/articles/${id}`, { auth: 'admin' }),
        create: (body) => request('/admin/social/articles', { method: 'POST', body, auth: 'admin' }),
        update: (id, body) => request(`/admin/social/articles/${id}`, { method: 'PATCH', body, auth: 'admin' }),
        remove: (id) => request(`/admin/social/articles/${id}`, { method: 'DELETE', auth: 'admin' })
    },
    webinars: {
        list: () => request('/admin/social/webinars', { auth: 'admin' }),
        get: (id) => request(`/admin/social/webinars/${id}`, { auth: 'admin' }),
        create: (body) => request('/admin/social/webinars', { method: 'POST', body, auth: 'admin' }),
        update: (id, body) => request(`/admin/social/webinars/${id}`, { method: 'PATCH', body, auth: 'admin' }),
        remove: (id) => request(`/admin/social/webinars/${id}`, { method: 'DELETE', auth: 'admin' })
    },
    courses: {
        list: () => request('/admin/social/courses', { auth: 'admin' }),
        get: (id) => request(`/admin/social/courses/${id}`, { auth: 'admin' }),
        create: (body) => request('/admin/social/courses', { method: 'POST', body, auth: 'admin' }),
        update: (id, body) => request(`/admin/social/courses/${id}`, { method: 'PATCH', body, auth: 'admin' }),
        remove: (id) => request(`/admin/social/courses/${id}`, { method: 'DELETE', auth: 'admin' }),
        days: (courseId) => request(`/admin/social/courses/${courseId}/days`, { auth: 'admin' }),
        dayCreate: (courseId, body) => request(`/admin/social/courses/${courseId}/days`, { method: 'POST', body, auth: 'admin' }),
        dayUpdate: (courseId, dayId, body) => request(`/admin/social/courses/${courseId}/days/${dayId}`, { method: 'PATCH', body, auth: 'admin' }),
        dayRemove: (courseId, dayId) => request(`/admin/social/courses/${courseId}/days/${dayId}`, { method: 'DELETE', auth: 'admin' }),
        enrollments: (courseId) => request(`/admin/social/courses/${courseId}/enrollments`, { auth: 'admin' }),
        supportList: (enrollmentId) => request(`/admin/social/courses/enrollments/${enrollmentId}/support`, { auth: 'admin' }),
        supportSend: (enrollmentId, body) => request(`/admin/social/courses/enrollments/${enrollmentId}/support`, { method: 'POST', body, auth: 'admin' })
    },
    polls: {
        create: (body) => request('/admin/social/polls', { method: 'POST', body, auth: 'admin' }),
        update: (id, body) => request(`/admin/social/polls/${id}`, { method: 'PATCH', body, auth: 'admin' }),
        remove: (id) => request(`/admin/social/polls/${id}`, { method: 'DELETE', auth: 'admin' })
    },
    comments: {
        list: (query) => request('/admin/social/comments', { query, auth: 'admin' }),
        remove: (id) => request(`/admin/social/comments/${id}`, { method: 'DELETE', auth: 'admin' })
    }
};
