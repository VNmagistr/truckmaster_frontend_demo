import api from './index';

// Журнал заїздів (read-only)
export const getArrivals = (params) => api.get('/alpr/arrivals/', { params });

// Список ігнорованих авто (CRUD)
export const getIgnored = () => api.get('/alpr/ignored/');
export const createIgnored = (data) => api.post('/alpr/ignored/', data);
export const updateIgnored = (id, data) => api.patch(`/alpr/ignored/${id}/`, data);
export const deleteIgnored = (id) => api.delete(`/alpr/ignored/${id}/`);
