
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export const auth = {
  register: (data) => api.post('/auth/register', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  login: (data) => api.post('/auth/login', data),
  verifyCode: (data) => api.post('/auth/verify-code', data),
  sendCode: (data) => api.post('/auth/send-code', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  resendCode: (email) => api.post('/auth/resend-code', { email }),
  checkCIN: (cinNumber) => api.post('/auth/check-cin', { cin_number: cinNumber }),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data)
};


export const admin = {
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getStatistics: () => api.get('/admin/statistics'),
  getSystemLogs: () => api.get('/admin/logs'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  reviewDocument: (id, data) => api.put(`/admin/documents/${id}/review`, data),
  getReportSuggestions: (params) => api.get('/admin/reports/suggestions', { params }),
  getReportTextAutocomplete: (params) => api.get('/admin/reports/text-autocomplete', { params }),
  getReportTokenAutocomplete: (params) => api.get('/admin/reports/token-autocomplete', { params }),
  getReports: (params) => api.get('/admin/reports', { params })
};


export const documents = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  delete: (id) => api.delete(`/documents/${id}`),
  getHistory: () => api.get('/documents/history'),
  getStats: () => api.get('/documents/stats'),
  getMyCIN: () => api.get('/documents/my-cin'),
  updateEntities: (id, data) => api.put(`/documents/${id}/entities`, data)
};

export default api;
