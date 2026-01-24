import axios from 'axios';

// Твій базовий конфіг (залиш як є)
const baseURL = 'http://127.0.0.1:8000/api';
const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Додаємо інтерцептори (залиш свої, якщо вони є)
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const ordersAPI = {
  getAll: (params) => instance.get('/orders/', { params }),
  getById: (id) => instance.get(`/orders/${id}/`),
  
  // ОНОВЛЕНО: Тепер вміє працювати з фото
  create: (data) => {
    // Якщо data це FormData (є фото), браузер сам поставить правильний заголовок
    if (data instanceof FormData) {
        return instance.post('/orders/', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return instance.post('/orders/', data);
  },
  
  update: (id, data) => instance.patch(`/orders/${id}/`, data),
  
  // Методи для робіт
  addWork: (orderId, data) => instance.post(`/orders/${orderId}/add_work/`, data),
  deleteWork: (workId) => instance.delete(`/works/${workId}/`), // Перевір шлях на бекенді
  
  // Методи для запчастин
  addPart: (orderId, data) => instance.post(`/orders/${orderId}/add_part/`, data),
};

export const maintenanceAPI = {
    // НОВЕ: Перевірка регламенту
    checkRegulations: (truckId, mileage) => 
        instance.get(`/maintenance/check-regulations/`, { params: { truck_id: truckId, mileage } }),
};

// ... інші API (clientsAPI, trucksAPI, etc.) залиш без змін ...
export const clientsAPI = { getAll: (p) => instance.get('/clients/', { params: p }) };
export const trucksAPI = { getAll: (p) => instance.get('/trucks/', { params: p }) };
export const worksAPI = { getAll: () => instance.get('/service-works/') }; // Або як у тебе називається прайс
export const employeesAPI = { getAll: () => instance.get('/users/', { params: { role: 'mechanic' } }) };
export const inventoryAPI = { getAll: (p) => instance.get('/inventory/', { params: p }) };

export default instance;