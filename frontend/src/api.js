import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

export const memberAPI = {
  getAll: () => api.get('/members/'),
  create: (data) => api.post('/members/', data),
  update: (id, data) => api.put(`/members/${id}/`, data),
  delete: (id) => api.delete(`/members/${id}/`),
};

export const houseAPI = {
  getAll: () => api.get('/houses/'),
  create: (data) => api.post('/houses/', data),
  update: (id, data) => api.put(`/houses/${id}/`, data),
  delete: (id) => api.delete(`/houses/${id}/`),
};

export const areaAPI = {
  getAll: () => api.get('/areas/'),
  create: (data) => api.post('/areas/', data),
  update: (id, data) => api.put(`/areas/${id}/`, data),
  delete: (id) => api.delete(`/areas/${id}/`),
};

export const collectionAPI = {
  getAll: () => api.get('/collections/'),
  create: (data) => api.post('/collections/', data),
  update: (id, data) => api.put(`/collections/${id}/`, data),
  delete: (id) => api.delete(`/collections/${id}/`),
};

export const subcollectionAPI = {
  getAll: () => api.get('/subcollections/'),
  create: (data) => api.post('/subcollections/', data),
  update: (id, data) => api.put(`/subcollections/${id}/`, data),
  delete: (id) => api.delete(`/subcollections/${id}/`),
};

export const obligationAPI = {
  getAll: () => api.get('/obligations/'),
  create: (data) => api.post('/obligations/', data),
  update: (id, data) => api.put(`/obligations/${id}/`, data),
  delete: (id) => api.delete(`/obligations/${id}/`),
};

export const eventAPI = {
  getAll: () => api.get('/events/'),
  create: (data) => api.post('/events/', data),
  update: (id, data) => api.put(`/events/${id}/`, data),
  delete: (id) => api.delete(`/events/${id}/`),
  exportData: () => api.post('/events/export_data/', {}, {
    responseType: 'blob',
  }),
  importData: (formData) => api.post('/events/import_data/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export default api;
