import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://REMOVED/api';

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
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),
  checkMaintenance: (truckId, mileage) => instance.post('/orders/check-maintenance/', { truck_id: truckId, current_mileage: mileage }),
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  addPart: (orderId, data) => instance.post(`/orders/${orderId}/add_part/`, data),
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
};

export const inventoryAPI = { 
    getAll: (params) => instance.get('/inventory/', { params }),
    getById: (id) => instance.get(`/inventory/${id}/`),
    create: (data) => instance.post('/inventory/', data),
    update: (id, data) => instance.patch(`/inventory/${id}/`, data),
    delete: (id) => instance.delete(`/inventory/${id}/`),
    
    // Аліаси для форми (щоб код у ProductFormPage працював)
    getProductById: (id) => instance.get(`/inventory/${id}/`),
    createProduct: (data) => instance.post('/inventory/', data),
    updateProduct: (id, data) => instance.patch(`/inventory/${id}/`, data),
    
    // Методи для категорій
    getCategories: () => instance.get('/inventory/categories/'),
    getSubcategories: () => instance.get('/inventory/subcategories/'),
    
    // Методи для детального перегляду
    getStockByProduct: (id) => instance.get(`/inventory/${id}/stock/`),
    getMovementsByProduct: (id) => instance.get(`/inventory/${id}/movements/`),
};

export const worksAPI = { getAll: (params) => instance.get('/service-works/', { params }) };
export const employeesAPI = { getAll: (params) => instance.get('/users/', { params: { ...params, role: 'mechanic' } }) };
export const baseModelsAPI = { getAll: () => instance.get('/base-models/') };

export default instance;