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

export const authAPI = {
  login: (data) => instance.post('/token/', data),
  refreshToken: (refresh) => instance.post('/token/refresh/', { refresh }),
  me: () => instance.get('/accounts/me/'),
};

export const ordersAPI = {
  getAll: (params) => instance.get('/orders/', { params }),
  getById: (id) => instance.get(`/orders/${id}/`),
  getStats: () => instance.get('/orders/stats/'),
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
  
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  deleteWork: (workId) => instance.delete(`/works/${workId}/`), 
  addPart: (orderId, data) => instance.post(`/orders/${orderId}/add_part/`, data),
};

export const maintenanceAPI = {
    checkRegulations: (truckId, mileage) => 
        instance.post('/orders/check-maintenance/', { 
            truck_id: truckId, 
            current_mileage: mileage 
        }),
};

export const clientsAPI = { 
    getAll: (params) => instance.get('/clients/', { params }),
    getById: (id) => instance.get(`/clients/${id}/`),
    create: (data) => instance.post('/clients/', data),
    update: (id, data) => instance.patch(`/clients/${id}/`, data),
    delete: (id) => instance.delete(`/clients/${id}/`),
};

export const trucksAPI = { 
    getAll: (params) => instance.get('/trucks/', { params }),
    getById: (id) => instance.get(`/trucks/${id}/`),
    create: (data) => instance.post('/trucks/', data),
    update: (id, data) => instance.patch(`/trucks/${id}/`, data),
    delete: (id) => instance.delete(`/trucks/${id}/`),
    getByClient: (clientId) => instance.get('/trucks/', { params: { client: clientId } }),
};

// 🔥 ДОДАНО: API для базових моделей
export const baseModelsAPI = {
    getAll: () => instance.get('/base-models/'),
};

export const worksAPI = { getAll: () => instance.get('/service-works/') };
export const employeesAPI = { getAll: () => instance.get('/users/', { params: { role: 'mechanic' } }) };
export const inventoryAPI = { getAll: (p) => instance.get('/inventory/', { params: p }) };

export default instance;