import api from './index';

export const getInvoices    = (params) => api.get('/invoices/', { params });
export const getInvoice     = (id)     => api.get(`/invoices/${id}/`);
export const createInvoice  = (data)   => api.post('/invoices/', data);
export const updateInvoice  = (id, data) => api.patch(`/invoices/${id}/`, data);
export const deleteInvoice  = (id)     => api.delete(`/invoices/${id}/`);
export const markSent       = (id)     => api.post(`/invoices/${id}/mark_sent/`);
export const markPaid       = (id)     => api.post(`/invoices/${id}/mark_paid/`);
export const cancelInvoice  = (id)     => api.post(`/invoices/${id}/cancel/`);

export const getItems       = (invoiceId) => api.get('/invoice-items/', { params: { invoice: invoiceId } });
export const createItem     = (data)   => api.post('/invoice-items/', data);
export const updateItem     = (id, data) => api.patch(`/invoice-items/${id}/`, data);
export const deleteItem     = (id)     => api.delete(`/invoice-items/${id}/`);
