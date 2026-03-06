import axios from 'axios';
import useCabinetAuthStore from '../store/cabinetAuthStore';

const baseURL = (import.meta.env.VITE_API_URL || 'https://api.ital-truck.com.ua/api') + '/cabinet';

const cabinetInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

cabinetInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('cabinet_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

cabinetInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(new Error('Сервер недоступний.'));
    }

    if (originalRequest.url?.includes('/token/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return cabinetInstance(originalRequest);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('cabinet_refresh_token');
      if (!refreshToken) {
        useCabinetAuthStore.getState().logout();
        window.location.href = '/cabinet/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${baseURL}/token/refresh/`, { refresh: refreshToken });
        const { access } = res.data;
        useCabinetAuthStore.getState().updateAccessToken(access);
        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return cabinetInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useCabinetAuthStore.getState().logout();
        window.location.href = '/cabinet/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const cabinetAuthAPI = {
  login: (data) => cabinetInstance.post('/token/', data),
  register: (data) => cabinetInstance.post('/register/', data),
};

export const cabinetAPI = {
  getMe: () => cabinetInstance.get('/me/'),
  getTrucks: () => cabinetInstance.get('/trucks/'),
  getOrders: (params) => cabinetInstance.get('/orders/', { params }),
  getOrderById: (id) => cabinetInstance.get(`/orders/${id}/`),
};

export default cabinetInstance;
