import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://157.230.114.19/api';

const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor для обробки помилок авторизації
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        error.config._retry = true;
        try {
          const response = await axios.post(`${baseURL}/token/refresh/`, {
            refresh: refreshToken
          });
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          error.config.headers.Authorization = `Bearer ${newAccessToken}`;
          return instance(error.config);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- API Methods ---

export const authAPI = {
    login: (credentials) => instance.post('/token/', credentials),
};

export const ordersAPI = {
  getAll: (params) => instance.get('/orders/', { params }),
  getById: (id) => instance.get(`/orders/${id}/`),
  create: (data) => instance.post('/orders/', data),
  update: (id, data) => instance.patch(`/orders/${id}/`, data),
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),
  checkMaintenance: (truckId, mileage) => instance.post('/orders/check-maintenance/', { truck_id: truckId, current_mileage: mileage }),
  markForDeletion: (id, reason) => instance.post(`/orders/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/orders/${id}/unmark_for_deletion/`),
  
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  
  addPartToWork: (workId, data) => instance.post(`/service-works/${workId}/add-part/`, data),
  removePartFromWork: (workId, partId) => instance.delete(`/service-works/${workId}/remove-part/${partId}/`),
};

export const clientsAPI = {
  getAll: (params) => instance.get('/clients/', { params }),
  getById: (id) => instance.get(`/clients/${id}/`),
};

export const trucksAPI = {
  getAll: (params) => instance.get('/trucks/', { params }),
  getById: (id) => instance.get(`/trucks/${id}/`),
};

export const worksAPI = {
  getAll: (params) => instance.get('/work-prices/', { params }),
  create: (data) => instance.post('/work-prices/', data),
  update: (id, data) => instance.patch(`/work-prices/${id}/`, data),
  delete: (id) => instance.delete(`/work-prices/${id}/`),
};

export const workGroupsAPI = {
  getAll: (params) => instance.get('/work-groups/', { params }),
  getById: (id) => instance.get(`/work-groups/${id}/`),
  create: (data) => instance.post('/work-groups/', data),
  update: (id, data) => instance.patch(`/work-groups/${id}/`, data),
  delete: (id) => instance.delete(`/work-groups/${id}/`),
};

export const employeesAPI = { 
  getAll: (params) => instance.get('/users/', { params: { ...params, group: 'Механіки' } }),
  getById: (id) => instance.get(`/users/${id}/`),
};

export const baseModelsAPI = { 
  getAll: () => instance.get('/base-models/'),
  getById: (id) => instance.get(`/base-models/${id}/`),
};

export const maintenanceAPI = {
  getRules: (params) => instance.get('/maintenance-rules/', { params }),
  getRuleById: (id) => instance.get(`/maintenance-rules/${id}/`),
  createRule: (data) => instance.post('/maintenance-rules/', data),
  updateRule: (id, data) => instance.patch(`/maintenance-rules/${id}/`, data),
  deleteRule: (id) => instance.delete(`/maintenance-rules/${id}/`),
};

export const inventoryAPI = {
  getAll: (params) => instance.get('/inventory/', { params }),
};

// ФІКС 401 ПОМИЛКИ: userAPI з правильними методами і URL
export const userAPI = {
  getMe: () => instance.get('/users/me/'),
  updateMe: (data) => instance.patch('/users/me/', data),
  deleteMe: () => instance.delete('/users/me/'),
  changePassword: (data) => instance.post('/users/me/change-password/', data),
};

export default instance;