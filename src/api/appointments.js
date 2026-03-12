import api from './index';

export const getAppointments = (params) => api.get('/appointments/', { params });
export const getAppointment = (id) => api.get(`/appointments/${id}/`);
export const createAppointment = (data) => api.post('/appointments/', data);
export const updateAppointment = (id, data) => api.patch(`/appointments/${id}/`, data);
export const deleteAppointment = (id) => api.delete(`/appointments/${id}/`);
export const confirmAppointment = (id) => api.post(`/appointments/${id}/confirm/`);
export const cancelAppointment = (id) => api.post(`/appointments/${id}/cancel/`);
export const completeAppointment = (id) => api.post(`/appointments/${id}/complete/`);

export const searchClients = (q) => api.get('/clients/', { params: { search: q, show_deleted: false } });
export const getClientTrucks = (clientId) => api.get('/trucks/', { params: { client: clientId, show_deleted: false } });
