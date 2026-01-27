import axios from 'axios';

const baseURL = 'http://157.230.114.19/:8000/api';

const instance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- ПОВЕРНУЛИ AUTH API ---
export const authAPI = {
  login: (data) => instance.post('/token/', data), // Перевір URL (може бути /accounts/login/)
  refreshToken: (refresh) => instance.post('/token/refresh/', { refresh }),
  me: () => instance.get('/accounts/me/'),
};

// --- ORDERS API (З нашими новими методами) ---
export const ordersAPI = {
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
  
  update: (id, data) => instance.patch(`/orders/${id}/`, data),
  
  delete: (id) => instance.delete(`/orders/${id}/`),

  // Живий пошук авто
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),

  // Перевірка регламенту
  checkMaintenance: (truckId, mileage) => 
    instance.post('/orders/check-maintenance/', { 
      truck_id: truckId, 
      current_mileage: mileage 
    }),

  // Додаткові методи
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  deleteWork: (workId) => instance.delete(`/works/${workId}/`), 
  addPart: (orderId, data) => instance.post(`/orders/${orderId}/add_part/`, data),
};

export const clientsAPI = {
  getAll: (params) => instance.get('/clients/', { params }),
  getById: (id) => instance.get(`/clients/${id}/`),
  create: (data) => instance.post('/clients/', data),
  update: (id, data) => instance.patch(`/clients/${id}/`, data),
};

export const trucksAPI = {
  getAll: (params) => instance.get('/trucks/', { params }),
  getById: (id) => instance.get(`/trucks/${id}/`),
  create: (data) => instance.post('/trucks/', data),
  update: (id, data) => instance.patch(`/trucks/${id}/`, data),
};

export const worksAPI = {
  getAll: (params) => instance.get('/service-works/', { params }),
};

export const employeesAPI = {
  getAll: () => instance.get('/users/', { params: { role: 'mechanic' } }),
};

export const inventoryAPI = {
  getAll: (params) => instance.get('/inventory/', { params }),
};

// maintenanceAPI залишаємо для сумісності, хоча логіку перенесли в orders
export const maintenanceAPI = {
    checkRegulations: (truckId, mileage) => 
        instance.get(`/maintenance/check-regulations/`, { params: { truck_id: truckId, mileage } }),
};

export default instance;