import axiosInstance from './axios';

export const inventoryAPI = {
  // Products/Parts
  getProducts: async (params = {}) => {
    const response = await axiosInstance.get('/inventory/products/', { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await axiosInstance.get(`/inventory/products/${id}/`);
    return response.data;
  },

  createProduct: async (data) => {
    const response = await axiosInstance.post('/inventory/products/', data);
    return response.data;
  },

  updateProduct: async (id, data) => {
    const response = await axiosInstance.put(`/inventory/products/${id}/`, data);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await axiosInstance.delete(`/inventory/products/${id}/`);
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await axiosInstance.get('/inventory/categories/');
    return response.data;
  },

  // Stock
  getStock: async (params = {}) => {
    const response = await axiosInstance.get('/inventory/stock/', { params });
    return response.data;
  },

  // Warehouses
  getWarehouses: async () => {
    const response = await axiosInstance.get('/inventory/warehouses/');
    return response.data;
  },

  // Low stock alerts
  getLowStock: async () => {
    const response = await axiosInstance.get('/inventory/products/low_stock/');
    return response.data;
  },
};

export default inventoryAPI;