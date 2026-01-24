import axiosInstance from './axios';
import authAPI from './auth';
import clientsAPI from './clients';
import trucksAPI from './trucks';
import baseOrdersAPI from './orders'; // Імпортуємо старі методи замовлень
import inventoryAPI from './inventory';

// --- Розширюємо ordersAPI новими методами ---
const ordersAPI = {
  ...baseOrdersAPI, // Зберігаємо всі старі методи (getAll, create, тощо)
  
  // Додавання/Видалення робіт
  addWork: (id, data) => axiosInstance.post(`/orders/${id}/add_work/`, data),
  removeWork: (orderId, workId) => axiosInstance.delete(`/orders/${orderId}/remove_work/${workId}/`),
  
  // Додавання/Видалення запчастин
  addPart: (id, data) => axiosInstance.post(`/orders/${id}/add_part/`, data),
  removePart: (orderId, partId) => axiosInstance.delete(`/orders/${orderId}/remove_part/${partId}/`),
};

// --- API для Послуг (Робіт) ---
const worksAPI = {
  getAll: (params) => axiosInstance.get('/works/', { params }),
};

// --- API для Працівників (Механіків) ---
const employeesAPI = {
  // Фільтруємо тільки механіків, якщо потрібно, або беремо всіх
  getAll: (params) => axiosInstance.get('/users/', { params: { ...params, role: 'mechanic' } }),
};

// Експортуємо все разом
export {
  axiosInstance,
  authAPI,
  clientsAPI,
  trucksAPI,
  ordersAPI,
  inventoryAPI,
  worksAPI,
  employeesAPI
};