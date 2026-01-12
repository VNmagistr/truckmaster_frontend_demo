import axiosInstance from './axios';

export const trucksAPI = {
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/trucks/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/trucks/${id}/`);
    return response.data;
  },

  getByClient: async (clientId) => {
    const response = await axiosInstance.get('/trucks/', {
      params: { client: clientId },
    });
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/trucks/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/trucks/${id}/`, data);
    return response.data;
  },

  patch: async (id, data) => {
    const response = await axiosInstance.patch(`/trucks/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/trucks/${id}/`);
    return response.data;
  },
};

export default trucksAPI;