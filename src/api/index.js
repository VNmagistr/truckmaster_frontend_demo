import axios from 'axios';

// Твій базовий конфіг
const baseURL = 'http://127.0.0.1:8000/api';
const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

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

  // --- НОВІ МЕТОДИ (підлаштовані під наш backend) ---
  
  // Живий пошук авто: GET /api/orders/search-truck/?plate=...
  searchTruck: (plate) => instance.get('/orders/search-truck/', { params: { plate } }),

  // Перевірка регламенту: POST /api/orders/check-maintenance/
  checkMaintenance: (truckId, mileage) => 
    instance.post('/orders/check-maintenance/', { 
      truck_id: truckId, 
      current_mileage: mileage 
    }),

  // Методи для робіт та запчастин
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  deleteWork: (workId) => instance.delete(`/works/${workId}/`), 
  addPart: (orderId, data) => instance.post(`/orders/${orderId}/add_part/`, data),
};

export const clientsAPI = { getAll: (p) => instance.get('/clients/', { params: p }) };
// trucksAPI залишаємо, але в формі створення ми його використовуватимемо менше
export const trucksAPI = { getAll: (p) => instance.get('/trucks/', { params: p }) };
export const worksAPI = { getAll: () => instance.get('/service-works/') };
export const employeesAPI = { getAll: () => instance.get('/users/', { params: { role: 'mechanic' } }) };
export const inventoryAPI = { getAll: (p) => instance.get('/inventory/', { params: p }) };

// maintenanceAPI більше не потрібен тут, бо ми перенесли логіку в ordersAPI, 
// але можеш залишити, якщо він використовується в інших місцях.
export const maintenanceAPI = {
    // Старий метод, якщо десь ще висить
    checkRegulations: (truckId, mileage) => 
        instance.get(`/maintenance/check-regulations/`, { params: { truck_id: truckId, mileage } }),
};

export default instance;