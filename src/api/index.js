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
    if (error.response?.status === 401) {
      // Спроба оновити токен
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${baseURL}/token/refresh/`, {
            refresh: refreshToken
          });
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          // Повторити оригінальний запит
          error.config.headers.Authorization = `Bearer ${newAccessToken}`;
          return instance(error.config);
        } catch (refreshError) {
          // Якщо refresh не вдався - розлогінити
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => instance.post('/token/', data),
  refreshToken: (refresh) => instance.post('/token/refresh/', { refresh }),
  me: () => instance.get('/accounts/me/'),
};

export const ordersAPI = {
  getAll: (params) => instance.get('/orders/', { params }),
  getById: (id) => instance.get(`/orders/${id}/`),
  create: (data) => {
    if (data instanceof FormData) {
      return instance.post('/orders/', data, { headers: { 'Content-Type': 'multipart/form-data' }});
    }
    return instance.post('/orders/', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return instance.patch(`/orders/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' }});
    }
    return instance.patch(`/orders/${id}/`, data);
  },
  delete: (id) => instance.delete(`/orders/${id}/`),
  
  // Пошук авто
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),
  
  // Перевірка регламентів ТО
  checkMaintenance: (truckId, mileage) => instance.post('/orders/check-maintenance/', { 
    truck_id: truckId, 
    current_mileage: mileage 
  }),
  
  // Позначення на видалення
  markForDeletion: (id, reason) => instance.post(`/orders/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/orders/${id}/unmark_for_deletion/`),
  
  // Статистика та інше
  getDashboardStats: () => instance.get('/orders/dashboard_stats/'),
  getRecent: (limit = 10) => instance.get('/orders/recent/', { params: { limit } }),
  
  // Роботи
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  addPart: (orderId, data) => instance.post(`/orders/${orderId}/add_part/`, data),
};

export const clientsAPI = { 
  getAll: (params) => instance.get('/clients/', { params }),
  getById: (id) => instance.get(`/clients/${id}/`),
  create: (data) => instance.post('/clients/', data),
  update: (id, data) => instance.patch(`/clients/${id}/`, data),
  delete: (id) => instance.delete(`/clients/${id}/`),
  
  // Позначення на видалення (якщо є)
  markForDeletion: (id, reason) => instance.post(`/clients/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/clients/${id}/unmark_for_deletion/`),
};

export const trucksAPI = { 
  getAll: (params) => instance.get('/trucks/', { params }),
  getById: (id) => instance.get(`/trucks/${id}/`),
  create: (data) => instance.post('/trucks/', data),
  update: (id, data) => instance.patch(`/trucks/${id}/`, data),
  delete: (id) => instance.delete(`/trucks/${id}/`),
  
  // Позначення на видалення (якщо є)
  markForDeletion: (id, reason) => instance.post(`/trucks/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/trucks/${id}/unmark_for_deletion/`),
};

export const inventoryAPI = { 
  getAll: (params) => instance.get('/inventory/', { params }),
  getById: (id) => instance.get(`/inventory/${id}/`),
  create: (data) => instance.post('/inventory/', data),
  update: (id, data) => instance.patch(`/inventory/${id}/`, data),
  delete: (id) => instance.delete(`/inventory/${id}/`),
  
  // Аліаси для форми
  getProductById: (id) => instance.get(`/inventory/${id}/`),
  createProduct: (data) => instance.post('/inventory/', data),
  updateProduct: (id, data) => instance.patch(`/inventory/${id}/`, data),
  
  // Методи для категорій
  getCategories: () => instance.get('/inventory/categories/'),
  getSubcategories: () => instance.get('/inventory/subcategories/'),
  
  // Методи для детального перегляду
  getStockByProduct: (id) => instance.get(`/inventory/${id}/stock/`),
  getMovementsByProduct: (id) => instance.get(`/inventory/${id}/movements/`),
  
  // Позначення на видалення
  markForDeletion: (id, reason) => instance.post(`/inventory/${id}/mark_for_deletion/`, { reason }),
  unmarkForDeletion: (id) => instance.post(`/inventory/${id}/unmark_for_deletion/`),
};

export const worksAPI = { 
  getAll: (params) => instance.get('/works/', { params }),
  getById: (id) => instance.get(`/works/${id}/`),
};

export const workGroupsAPI = {
  getAll: (params) => instance.get('/work-groups/', { params }),
  getById: (id) => instance.get(`/work-groups/${id}/`),
};

export const employeesAPI = { 
  getAll: (params) => instance.get('/users/', { params: { ...params, role: 'mechanic' } }) 
};

export const baseModelsAPI = { 
  getAll: () => instance.get('/base-models/') 
};

export default instance;

export const userAPI = {
  getMe: () => axios.get('/api/users/me/'),
  updateMe: (data) => axios.patch('/api/users/me/', data),
  deleteMe: () => axios.delete('/api/users/me/'),
  changePassword: (data) => axios.post('/api/users/me/change-password/', data),
};