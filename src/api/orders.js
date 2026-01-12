import axiosInstance from './axios';

export const ordersAPI = {
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/service-orders/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/service-orders/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/service-orders/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/service-orders/${id}/`, data);
    return response.data;
  },

  patch: async (id, data) => {
    const response = await axiosInstance.patch(`/service-orders/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/service-orders/${id}/`);
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await axiosInstance.get('/service-orders/dashboard_stats/');
    return response.data;
  },

  getRecent: async (limit = 10) => {
    const response = await axiosInstance.get('/service-orders/recent/', {
      params: { limit },
    });
    return response.data;
  },
};

export default ordersAPI;