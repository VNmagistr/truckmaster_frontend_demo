import axios from 'axios';

const baseURL = 'http://http://157.230.114.19:8000/api'; 

const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// --- AUTH API (Був відсутній у твоєму файлі!) ---
export const authAPI = {
  login: (data) => instance.post('/token/', data),
  refreshToken: (refresh) => instance.post('/token/refresh/', { refresh }),
  me: () => instance.get('/accounts/me/'),
};

// --- ORDERS API ---
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
  
  // Додаткові методи
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  deleteWork: (workId) => instance.delete(`/works/${workId}/`), 
  addPart: (orderId, data) => instance.post(`/orders/${orderId}/add_part/`, data),
};

// --- MAINTENANCE API ---
export const maintenanceAPI = {
    checkRegulations: (truckId, mileage) => 
        instance.post('/orders/check-maintenance/', { 
            truck_id: truckId, 
            current_mileage: mileage 
        }),
};

// --- ІНШІ API ---
export const clientsAPI = { 
    getAll: (params) => instance.get('/clients/', { params }),
    getById: (id) => instance.get(`/clients/${id}/`),
};

export const trucksAPI = { 
    getAll: (params) => instance.get('/trucks/', { params }),
    getById: (id) => instance.get(`/trucks/${id}/`),
};

export const worksAPI = { getAll: () => instance.get('/service-works/') };
export const employeesAPI = { getAll: () => instance.get('/users/', { params: { role: 'mechanic' } }) };
export const inventoryAPI = { getAll: (p) => instance.get('/inventory/', { params: p }) };

export default instance;