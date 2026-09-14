import axios from 'axios';

// ─── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ─── Request Interceptor: Attach Admin Token ───────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// ─── Admin API Object ──────────────────────────────────────────────────────────
export const adminApi = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email, password) =>
    api.post('/auth/admin/login', { email, password }),

  getMe: () =>
    api.get('/auth/me'),

  // ── Stats / Dashboard ─────────────────────────────────────────────────────
  getStats: () =>
    api.get('/admin/stats'),

  // ── Couples ───────────────────────────────────────────────────────────────
  getCouples: (params) =>
    api.get('/admin/couples', { params }),

  getCoupleDetail: (id) =>
    api.get(`/admin/couples/${id}`),

  suspendCouple: (id) =>
    api.patch(`/admin/couples/${id}/suspend`),

  activateCouple: (id) =>
    api.patch(`/admin/couples/${id}/activate`),

  deleteCouple: (id) =>
    api.delete(`/admin/couples/${id}`),

  updateSubscription: (id, tier) =>
    api.patch(`/admin/couples/${id}/subscription`, { tier }),

  // ── Themes ────────────────────────────────────────────────────────────────
  getThemes: () =>
    api.get('/admin/themes'),

  createTheme: (data) =>
    api.post('/admin/themes', data),

  updateTheme: (id, data) =>
    api.put(`/admin/themes/${id}`, data),

  deleteTheme: (id) =>
    api.delete(`/admin/themes/${id}`),

  toggleThemeActive: (id) =>
    api.patch(`/admin/themes/${id}/toggle`),

  // ── Card Templates ────────────────────────────────────────────────────────
  getCardTemplates: () =>
    api.get('/admin/card-templates'),

  createCardTemplate: (data) =>
    api.post('/card-templates', data),

  updateCardTemplate: (id, data) =>
    api.put(`/card-templates/${id}`, data),

  deleteCardTemplate: (id) =>
    api.delete(`/card-templates/${id}`),

  toggleCardTemplateActive: (id) =>
    api.put(`/card-templates/${id}/toggle`),

  uploadCardTemplateImage: (formData) =>
    api.post('/card-templates/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // ── Media Moderation ──────────────────────────────────────────────────────
  getMediaQueue: (params) =>
    api.get('/admin/media', { params }),

  approveMedia: (id) =>
    api.patch(`/admin/media/${id}/approve`),

  rejectMedia: (id) =>
    api.patch(`/admin/media/${id}/reject`),

  bulkApproveMedia: (ids) =>
    api.post('/admin/media/bulk-approve', { ids }),

  bulkRejectMedia: (ids) =>
    api.post('/admin/media/bulk-reject', { ids }),

  // ── Notifications ─────────────────────────────────────────────────────────
  broadcastNotification: (data) =>
    api.post('/admin/notifications/broadcast', data),

  getNotifications: () =>
    api.get('/admin/notifications'),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings: () =>
    api.get('/admin/settings'),

  updateSettings: (data) =>
    api.put('/admin/settings', data),

  // ── Admin Accounts ────────────────────────────────────────────────────────
  getAdmins: () =>
    api.get('/admin/accounts'),

  createAdmin: (data) =>
    api.post('/admin/accounts', data),

  deactivateAdmin: (id) =>
    api.patch(`/admin/accounts/${id}/deactivate`),
};

export default api;
