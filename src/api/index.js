import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://157.230.114.19/api';

const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor - add auth token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors and token refresh
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network error (server unavailable)
    if (!error.response) {
      console.error('Network error - server unavailable');
      return Promise.reject(new Error('Сервер недоступний. Перевірте підключення до мережі.'));
    }

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        originalRequest._retry = true;
        
        try {
          const response = await axios.post(`${baseURL}/token/refresh/`, {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        window.location.href = '/login';
      }
    }

    // Log other errors for debugging
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.status, error.response?.data);
    }

    return Promise.reject(error);
  }
);

// --- API Methods ---

export const authAPI = {
  login: (credentials) => instance.post('/token/', credentials),
  register: (data) => instance.post('/register/', data),
  refreshToken: (refresh) => instance.post('/token/refresh/', { refresh }),
};

export const ordersAPI = {
  // CRUD
  getAll: (params) => instance.get('/orders/', { params }),
  getById: (id) => instance.get(`/orders/${id}/`),
  create: (data) => {
    if (data instanceof FormData) {
      return instance.post('/orders/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return instance.post('/orders/', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return instance.patch(`/orders/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return instance.patch(`/orders/${id}/`, data);
  },

  // Custom actions
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),
  checkMaintenance: (truckId, mileage) => instance.post('/orders/check-maintenance/', {
    truck_id: truckId,
    current_mileage: mileage
  }),
  markForDeletion: (id, reason) => instance.post(`/orders/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/orders/${id}/unmark_for_deletion/`),
  getDashboardStats: () => instance.get('/orders/dashboard_stats/'),

  // Works management
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  updateWork: (workId, data) => instance.patch(`/service-works/${workId}/`, data),
  removeWork: (workId) => instance.delete(`/service-works/${workId}/`),

  // Parts management
  addPartToWork: (workId, data) => instance.post(`/service-works/${workId}/add-part/`, data),
  removePartFromWork: (workId, partId) => instance.delete(`/service-works/${workId}/remove-part/${partId}/`),
};

export const clientsAPI = {
  getAll: (params) => instance.get('/clients/', { params }),
  getById: (id) => instance.get(`/clients/${id}/`),
  create: (data) => instance.post('/clients/', data),
  update: (id, data) => instance.patch(`/clients/${id}/`, data),
  delete: (id) => instance.delete(`/clients/${id}/`),
  markForDeletion: (id, reason) => instance.post(`/clients/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/clients/${id}/unmark_for_deletion/`),
};

export const trucksAPI = {
  getAll: (params) => instance.get('/trucks/', { params }),
  getById: (id) => instance.get(`/trucks/${id}/`),
  create: (data) => instance.post('/trucks/', data),
  update: (id, data) => instance.patch(`/trucks/${id}/`, data),
  delete: (id) => instance.delete(`/trucks/${id}/`),
  markForDeletion: (id, reason) => instance.post(`/trucks/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/trucks/${id}/unmark_for_deletion/`),
};

export const worksAPI = {
  getAll: (params) => instance.get('/work-prices/', { params }),
  getById: (id) => instance.get(`/work-prices/${id}/`),
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
  // Rules
  getRules: (params) => instance.get('/maintenance-rules/', { params }),
  getRuleById: (id) => instance.get(`/maintenance-rules/${id}/`),
  createRule: (data) => instance.post('/maintenance-rules/', data),
  updateRule: (id, data) => instance.patch(`/maintenance-rules/${id}/`, data),
  deleteRule: (id) => instance.delete(`/maintenance-rules/${id}/`),
};

export const inventoryAPI = {
  // Products
  getAll: (params) => instance.get('/inventory/products/', { params }),
  getById: (id) => instance.get(`/inventory/products/${id}/`),
  createProduct: (data) => instance.post('/inventory/products/', data),
  updateProduct: (id, data) => instance.patch(`/inventory/products/${id}/`, data),
  deleteProduct: (id) => instance.delete(`/inventory/products/${id}/`),
  
  // Categories
  getCategories: (params) => instance.get('/inventory/categories/', { params }),
  getCategoryById: (id) => instance.get(`/inventory/categories/${id}/`),
  createCategory: (data) => instance.post('/inventory/categories/', data),
  updateCategory: (id, data) => instance.patch(`/inventory/categories/${id}/`, data),
  deleteCategory: (id) => instance.delete(`/inventory/categories/${id}/`),
};

export const userAPI = {
  // Current user methods
  getMe: () => instance.get('/users/me/'),
  updateMe: (data) => instance.patch('/users/me/', data),
  deleteMe: () => instance.delete('/users/me/'),
  changePassword: (data) => instance.post('/users/me/change-password/', data),

  // Admin methods
  getAll: (params) => instance.get('/users/', { params }),
  getById: (id) => instance.get(`/users/${id}/`),
  create: (data) => instance.post('/users/', data),
  update: (id, data) => instance.patch(`/users/${id}/`, data),
  delete: (id) => instance.delete(`/users/${id}/`),
};

export default instance;
