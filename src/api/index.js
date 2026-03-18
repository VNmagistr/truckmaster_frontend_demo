import axios from 'axios';
import useAuthStore from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://REMOVED/api';

const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor — add auth token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors and token refresh
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network error (server unavailable)
    if (!error.response) {
      return Promise.reject(new Error('Сервер недоступний. Перевірте підключення до мережі.'));
    }

    // Skip token refresh for auth endpoints
    if (
      originalRequest.url?.includes('/token/') ||
      originalRequest.url?.includes('/register/')
    ) {
      return Promise.reject(error);
    }

    // Handle 401 — try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${baseURL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        useAuthStore.getState().updateAccessToken(access);
        processQueue(null, access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
  getAll: (params) => instance.get('/orders/', { params }),
  getById: (id) => instance.get(`/orders/${id}/`),
  create: (data) => {
    if (data instanceof FormData) {
      return instance.post('/orders/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return instance.post('/orders/', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return instance.patch(`/orders/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return instance.patch(`/orders/${id}/`, data);
  },

  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),
  checkMaintenance: (truckId, mileage) => instance.post('/orders/check-maintenance/', {
    truck_id: truckId,
    current_mileage: mileage,
  }),
  markForDeletion: (id, reason) => instance.post(`/orders/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/orders/${id}/unmark_for_deletion/`),
  getDashboardStats: () => instance.get('/orders/dashboard_stats/'),
  exportPdf: (id) => instance.get(`/orders/${id}/pdf/`, { responseType: 'blob' }),
  getStats: () => instance.get('/orders/stats/'),
  getWeekDetail: () => instance.get('/orders/week_detail/'),

  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  updateWork: (workId, data) => instance.patch(`/service-works/${workId}/`, data),
  removeWork: (workId) => instance.delete(`/service-works/${workId}/`),

  addPartToWork: (workId, data) => instance.post(`/service-works/${workId}/add-part/`, data),
  removePartFromWork: (workId, partId) => instance.delete(`/service-works/${workId}/remove-part/${partId}/`),
  applyMaintenanceSet: (orderId, data) => instance.post(`/orders/${orderId}/apply_maintenance_set/`, data),
  applyKit: (workId) => instance.post(`/service-works/${workId}/apply-kit/`),
  getMaintenanceCountdown: (orderId) => instance.get(`/orders/${orderId}/maintenance-countdown/`),
  getStatusHistory: (id) => instance.get(`/orders/${id}/status-history/`),
  getPdfMechanic: (id) => instance.get(`/orders/${id}/pdf-mechanic/`, { responseType: 'blob' }),
};

export const repairPhotosAPI = {
  upload: (formData) => instance.post('/repair-photos/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => instance.delete(`/repair-photos/${id}/`),
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
  getRules: (params) => instance.get('/maintenance-rules/', { params }),
  getRuleById: (id) => instance.get(`/maintenance-rules/${id}/`),
  createRule: (data) => instance.post('/maintenance-rules/', data),
  updateRule: (id, data) => instance.patch(`/maintenance-rules/${id}/`, data),
  deleteRule: (id) => instance.delete(`/maintenance-rules/${id}/`),

  getKit: (truckId) => instance.get('/maintenance-kits/', { params: { truck: truckId } }),
  createKit: (data) => instance.post('/maintenance-kits/', data),
  updateKit: (id, data) => instance.patch(`/maintenance-kits/${id}/`, data),
  addKitFilter: (kitId, data) => instance.post(`/maintenance-kits/${kitId}/add-filter/`, data),
  removeKitFilter: (kitId, filterId) => instance.delete(`/maintenance-kits/${kitId}/remove-filter/${filterId}/`),

  getLogs: (truckId) => instance.get('/orders/maintenance-logs/', { params: { truck: truckId } }),

  // Service types
  getServiceTypes: () => instance.get('/maintenance/service-types/'),

  // Service reminders
  getReminders: (params) => instance.get('/maintenance/reminders/', { params }),
  getRemindersByTruck: (truckId) => instance.get('/maintenance/reminders/by_truck/', { params: { truck_id: truckId } }),
  createReminder: (data) => instance.post('/maintenance/reminders/', data),
  updateReminder: (id, data) => instance.patch(`/maintenance/reminders/${id}/`, data),
  deleteReminder: (id) => instance.delete(`/maintenance/reminders/${id}/`),
  completeReminder: (id, orderId) => instance.post(`/maintenance/reminders/${id}/complete/`, orderId ? { order_id: orderId } : {}),
  dismissReminder: (id) => instance.post(`/maintenance/reminders/${id}/dismiss/`),

  getIntervals: (truckId) => instance.get('/maintenance-intervals/', { params: { truck: truckId } }),
  saveIntervals: (truckId, data) => {
    // Try update first, fall back to create
    return instance.get('/maintenance-intervals/', { params: { truck: truckId } })
      .then(res => {
        const d = res.data || res;
        const list = Array.isArray(d) ? d : (d.results || []);
        if (list.length > 0) {
          return instance.patch(`/maintenance-intervals/${list[0].id}/`, data);
        }
        return instance.post('/maintenance-intervals/', { truck: truckId, ...data });
      });
  },
};

export const inventoryAPI = {
  // Products
  getAll: (params) => instance.get('/inventory/products/', { params }),
  getById: (id) => instance.get(`/inventory/products/${id}/`),
  getProductById: (id) => instance.get(`/inventory/products/${id}/`),
  createProduct: (data) => instance.post('/inventory/products/', data),
  updateProduct: (id, data) => instance.patch(`/inventory/products/${id}/`, data),
  markForDeletion: (id) => instance.post(`/inventory/products/${id}/mark_for_deletion/`),
  unmarkForDeletion: (id) => instance.post(`/inventory/products/${id}/unmark_for_deletion/`),

  // Categories
  getCategories: (params) => instance.get('/inventory/categories/', { params }),
  getCategoryById: (id) => instance.get(`/inventory/categories/${id}/`),
  createCategory: (data) => instance.post('/inventory/categories/', data),
  updateCategory: (id, data) => instance.patch(`/inventory/categories/${id}/`, data),
  deleteCategory: (id) => instance.delete(`/inventory/categories/${id}/`),

  // Subcategories
  getSubcategories: (params) => instance.get('/inventory/subcategories/', { params }),
  getSubcategoryById: (id) => instance.get(`/inventory/subcategories/${id}/`),
  createSubcategory: (data) => instance.post('/inventory/subcategories/', data),
  updateSubcategory: (id, data) => instance.patch(`/inventory/subcategories/${id}/`, data),
  deleteSubcategory: (id) => instance.delete(`/inventory/subcategories/${id}/`),

  // Warehouses
  getWarehouses: (params) => instance.get('/inventory/warehouses/', { params }),
  getWarehouseById: (id) => instance.get(`/inventory/warehouses/${id}/`),
  createWarehouse: (data) => instance.post('/inventory/warehouses/', data),
  updateWarehouse: (id, data) => instance.patch(`/inventory/warehouses/${id}/`, data),
  deleteWarehouse: (id) => instance.delete(`/inventory/warehouses/${id}/`),

  // Stock
  getStock: (params) => instance.get('/inventory/stock/', { params }),
  getStockById: (id) => instance.get(`/inventory/stock/${id}/`),
  getStockByProduct: (productId) => instance.get('/inventory/stock/', { params: { product: productId } }),
  updateStock: (id, data) => instance.patch(`/inventory/stock/${id}/`, data),

  // Movements
  getMovements: (params) => instance.get('/inventory/movements/', { params }),
  getMovementsByProduct: (productId) => instance.get('/inventory/movements/', { params: { product: productId } }),
  createMovement: (data) => instance.post('/inventory/movements/', data),
};

export const userAPI = {
  getMe: () => instance.get('/users/me/'),
  updateMe: (data) => instance.patch('/users/me/', data),
  deleteMe: () => instance.delete('/users/me/'),
  changePassword: (data) => instance.post('/users/me/change-password/', data),

  getAll: (params) => instance.get('/users/', { params }),
  getById: (id) => instance.get(`/users/${id}/`),
  create: (data) => instance.post('/users/', data),
  update: (id, data) => instance.patch(`/users/${id}/`, data),
  delete: (id) => instance.delete(`/users/${id}/`),
};

export const botAPI = {
  // Statistics
  getStatistics: () => instance.get('/bot/users/statistics/'),

  // BotUsers
  getUsers: (params) => instance.get('/bot/users/', { params }),
  getUserById: (id) => instance.get(`/bot/users/${id}/`),
  createUser: (data) => instance.post('/bot/users/', data),
  updateUser: (id, data) => instance.patch(`/bot/users/${id}/`, data),
  deleteUser: (id) => instance.delete(`/bot/users/${id}/`),

  // Message logs (read-only)
  getMessages: (params) => instance.get('/bot/messages/', { params }),
  getRecentMessages: () => instance.get('/bot/messages/recent/'),

  // Reminder settings
  getReminders: (params) => instance.get('/bot/reminders/', { params }),
  updateReminder: (id, data) => instance.patch(`/bot/reminders/${id}/`, data),
};

export default instance;
