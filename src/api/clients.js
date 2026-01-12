import axiosInstance from './axios';

export const clientsAPI = {
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/clients/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/clients/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/clients/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/clients/${id}/`, data);
    return response.data;
  },

  patch: async (id, data) => {
    const response = await axiosInstance.patch(`/clients/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/clients/${id}/`);
    return response.data;
  },
};

export default clientsAPI;