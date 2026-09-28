import axios from 'axios';

// VITE_API_BASE_URL may be a full URL ("http://localhost:5000/api") or a bare
// host (Render's cross-service env vars only provide the hostname, e.g.
// "savethedate-backend.onrender.com") - normalize either form to a full URL.
function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw) return '/api';
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  const trimmed = withScheme.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({ baseURL: API_BASE_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ac_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Endpoints where a 401 is a normal "wrong credentials" response, not an
// expired-session signal - must NOT trigger the global redirect below,
// otherwise the page navigates away before the caller's own error handling
// (e.g. the login form's toast) ever runs, making auth failures look silent.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

// Handle 401 globally (expired/invalid session on an already-authenticated request)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('ac_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────
export const authApi = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  getMe: () => api.get('/auth/me'),
  changePassword: (d) => api.put('/auth/change-password', d),
  refreshToken: (d) => api.post('/auth/refresh', d),
};

// ─── Couple ───────────────────────────────────────────────
export const coupleApi = {
  getProfile: () => api.get('/couple/profile'),
  updateProfile: (d) => api.put('/couple/profile', d),
  updateTheme: (d) => api.put('/couple/theme', d),
  updateCoverPhoto: (d) => api.post('/couple/cover-photo', d),
  publishWebsite: () => api.put('/couple/publish'),
  unpublishWebsite: () => api.put('/couple/unpublish'),
  getDashboardStats: () => api.get('/couple/dashboard-stats'),
};

// ─── Guests ───────────────────────────────────────────────
export const guestApi = {
  getAll: (params) => api.get('/guests', { params }),
  getById: (id) => api.get(`/guests/${id}`),
  create: (d) => api.post('/guests', d),
  update: (id, d) => api.put(`/guests/${id}`, d),
  remove: (id) => api.delete(`/guests/${id}`),
  importCSV: (formData) => api.post('/guests/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportCSV: () => api.get('/guests/export', { responseType: 'blob' }),
  assignToEvents: (id, eventIds) => api.post(`/guests/${id}/events`, { eventIds }),
  getGuestEvents: (id) => api.get(`/guests/${id}/events`),
  removeFromEvent: (id, eventId) => api.delete(`/guests/${id}/events/${eventId}`),
  getParties: () => api.get('/guests/parties'),
  createParty: (d) => api.post('/guests/parties', d),
  updateParty: (id, d) => api.put(`/guests/parties/${id}`, d),
  deleteParty: (id) => api.delete(`/guests/parties/${id}`),
};

// ─── Events ───────────────────────────────────────────────
export const eventApi = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  create: (d) => api.post('/events', d),
  update: (id, d) => api.put(`/events/${id}`, d),
  remove: (id) => api.delete(`/events/${id}`),
  getEventGuests: (id) => api.get(`/events/${id}/guests`),
  bulkAssignGuests: (id, guestIds) => api.post(`/events/${id}/guests/bulk`, { guestIds }),
  removeGuestFromEvent: (eventId, guestId) => api.delete(`/events/${eventId}/guests/${guestId}`),
};

// ─── RSVP ─────────────────────────────────────────────────
export const rsvpApi = {
  getPublicForm: (token) => api.get(`/rsvp/form/${token}`),
  submitRsvp: (token, d) => api.post(`/rsvp/submit/${token}`, d),
  getResponses: (params) => api.get('/rsvp/responses', { params }),
  getStats: () => api.get('/rsvp/stats'),
  getQuestions: (params) => api.get('/rsvp/questions', { params }),
  createQuestion: (d) => api.post('/rsvp/questions', d),
  updateQuestion: (id, d) => api.put(`/rsvp/questions/${id}`, d),
  deleteQuestion: (id) => api.delete(`/rsvp/questions/${id}`),
  sendInvites: (d) => api.post('/rsvp/send-invites', d),
};

// ─── Media ────────────────────────────────────────────────
export const mediaApi = {
  upload: (formData) => api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  guestUpload: (slug, formData) => api.post(`/media/upload/${slug}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/media', { params }),
  getPending: () => api.get('/media/pending'),
  getPublicGallery: (slug) => api.get(`/media/gallery/${slug}`),
  approve: (id) => api.put(`/media/${id}/approve`),
  toggleFeatured: (id) => api.put(`/media/${id}/feature`),
  remove: (id) => api.delete(`/media/${id}`),
  bulkApprove: (ids) => api.post('/media/bulk-approve', { ids }),
};

// ─── Guestbook ────────────────────────────────────────────
export const guestbookApi = {
  getAll: () => api.get('/guestbook'),
  getApproved: (slug) => api.get(`/guestbook/${slug}`),
  getPending: () => api.get('/guestbook/pending'),
  create: (slug, d) => api.post(`/guestbook/${slug}`, d),
  approve: (id) => api.put(`/guestbook/${id}/approve`),
  remove: (id) => api.delete(`/guestbook/${id}`),
};

// ─── Registry ─────────────────────────────────────────────
export const registryApi = {
  getAll: () => api.get('/registry'),
  create: (d) => api.post('/registry', d),
  update: (id, d) => api.put(`/registry/${id}`, d),
  remove: (id) => api.delete(`/registry/${id}`),
  markPurchased: (id) => api.put(`/registry/${id}/purchased`),
};

// ─── Travel ───────────────────────────────────────────────
export const travelApi = {
  getAll: () => api.get('/travel'),
  create: (d) => api.post('/travel', d),
  update: (id, d) => api.put(`/travel/${id}`, d),
  remove: (id) => api.delete(`/travel/${id}`),
  reorder: (ids) => api.put('/travel/reorder', { ids }),
};

// ─── Themes ───────────────────────────────────────────────
export const themeApi = {
  getAll: () => api.get('/themes'),
};

// ─── Card Templates ───────────────────────────────────────
export const cardTemplateApi = {
  getAll: () => api.get('/card-templates'),
};

// ─── Wedding Card ───────────────────────────────────────────
export const cardApi = {
  getMine: () => api.get('/cards/me'),
  updateMine: (d) => api.put('/cards/me', d),
  publish: () => api.put('/cards/me/publish'),
  unpublish: () => api.put('/cards/me/unpublish'),
  getPublic: (slug) => api.get(`/public/card/${slug}`),
};

// ─── Notifications ────────────────────────────────────────
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  create: (d) => api.post('/notifications', d),
  send: (id) => api.post(`/notifications/${id}/send`),
  remove: (id) => api.delete(`/notifications/${id}`),
};

// ─── Public ───────────────────────────────────────────────
export const publicApi = {
  getWebsite: (slug) => api.get(`/public/website/${slug}`),
  getGallery: (slug) => api.get(`/public/website/${slug}/gallery`),
  getGuestbook: (slug) => api.get(`/public/website/${slug}/guestbook`),
  getRegistry: (slug) => api.get(`/public/website/${slug}/registry`),
  getTravel: (slug) => api.get(`/public/website/${slug}/travel`),
};

export default api;

