import axiosInstance from './axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const authAPI = {
  login: async (username, password) => {
    const response = await axiosInstance.post('/token/', {
      username,
      password,
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await axiosInstance.post('/register/', userData);
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await axiosInstance.post('/token/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

export default authAPI;