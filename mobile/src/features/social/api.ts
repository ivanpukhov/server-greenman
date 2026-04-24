import { api } from '@/lib/api/client';

export const socialApi = {
  feed: (params?: { cursor?: string; limit?: number }) =>
    api.get('/social/feed', { params }).then((r) => r.data),
  search: (params: { q: string; kind?: string; limit?: number }) =>
    api.get('/social/search', { params }).then((r) => r.data),
  posts: {
    list: (params?: { limit?: number; before?: string }) =>
      api.get('/social/posts', { params }).then((r) => r.data),
    get: (id: number) => api.get(`/social/posts/${id}`).then((r) => r.data),
  },
  reels: {
    list: (params?: { limit?: number; cursor?: string }) =>
      api.get('/social/reels', { params }).then((r) => r.data),
    view: (id: number) => api.post(`/social/reels/${id}/view`).then((r) => r.data),
  },
  stories: {
    active: () => api.get('/social/stories/active').then((r) => r.data),
    view: (id: number) => api.post(`/social/stories/${id}/view`).then((r) => r.data),
  },
  articles: {
    list: (params?: { limit?: number; before?: string }) =>
      api.get('/social/articles', { params }).then((r) => r.data),
    get: (slug: string) => api.get(`/social/articles/${slug}`).then((r) => r.data),
  },
  webinars: {
    list: () => api.get('/social/webinars').then((r) => r.data),
    get: (slug: string) => api.get(`/social/webinars/${slug}`).then((r) => r.data),
  },
  courses: {
    list: () => api.get('/social/courses').then((r) => r.data),
    get: (slug: string) => api.get(`/social/courses/${slug}`).then((r) => r.data),
    enroll: (id: number) => api.post(`/social/courses/${id}/enroll`).then((r) => r.data),
    days: (slug: string) => api.get(`/social/courses/${slug}/days`).then((r) => r.data),
    day: (slug: string, n: number | string) =>
      api.get(`/social/courses/${slug}/days/${n}`).then((r) => r.data),
    mine: () => api.get('/social/courses/mine').then((r) => r.data),
    submitReport: (enrollmentId: number, body: { courseDayId: number; text: string }) =>
      api.post(`/social/courses/enrollments/${enrollmentId}/reports`, body).then((r) => r.data),
    supportList: (enrollmentId: number) =>
      api.get(`/social/courses/enrollments/${enrollmentId}/support`).then((r) => r.data),
    supportSend: (enrollmentId: number, body: { text: string }) =>
      api.post(`/social/courses/enrollments/${enrollmentId}/support`, body).then((r) => r.data),
    completeDay: (slug: string, dayNumber: number | string) =>
      api.post(`/social/courses/${slug}/days/${dayNumber}/complete`).then((r) => r.data),
  },
  profile: {
    activity: () => api.get('/social/profile/activity').then((r) => r.data),
    homework: () => api.get('/social/profile/homework').then((r) => r.data),
  },
  polls: {
    vote: (id: number, optionIds: number[]) =>
      api.post(`/social/polls/${id}/vote`, { optionIds }).then((r) => r.data),
  },
  comments: {
    list: (type: string, id: number) =>
      api.get('/social/comments', { params: { type, id } }).then((r) => r.data),
    create: (body: { type: string; id: number; body: string; parentCommentId?: number }) =>
      api.post('/social/comments', body).then((r) => r.data),
    remove: (id: number) => api.delete(`/social/comments/${id}`).then((r) => r.data),
  },
  reactions: {
    counts: (type: string, id: number) =>
      api.get('/social/reactions', { params: { type, id } }).then((r) => r.data),
    toggle: (type: string, id: number, reaction: string = 'like') =>
      api.post('/social/reactions/toggle', { type, id, reaction }).then((r) => r.data),
  },
  bookmarks: {
    list: (params?: { kind?: string; limit?: number; before?: string }) =>
      api.get('/social/bookmarks', { params }).then((r) => r.data),
    toggle: (type: string, id: number) =>
      api.post('/social/bookmarks/toggle', { type, id }).then((r) => r.data),
  },
  reposts: {
    list: (params?: { kind?: string; limit?: number; before?: string }) =>
      api.get('/social/reposts', { params }).then((r) => r.data),
    toggle: (type: string, id: number) =>
      api.post('/social/reposts/toggle', { type, id }).then((r) => r.data),
  },
};
