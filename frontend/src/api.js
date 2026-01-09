import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

export const memberAPI = {
  getAll: () => api.get('/members/'),
  get: (id) => api.get(`/members/${id}/`),
  create: (data) => api.post('/members/', data),
  update: (id, data) => api.put(`/members/${id}/`, data),
  partialUpdate: (id, data) => api.patch(`/members/${id}/`, data),
  delete: (id) => api.delete(`/members/${id}/`),
  search: (params) => api.get('/members/search/', { params }),
};

export const houseAPI = {
  getAll: () => api.get('/houses/'),
  get: (id) => api.get(`/houses/${id}/`),
  create: (data) => api.post('/houses/', data),
  update: (id, data) => api.put(`/houses/${id}/`, data),
  delete: (id) => api.delete(`/houses/${id}/`),
  search: (params) => api.get('/houses/search/', { params }),
};

export const areaAPI = {
  getAll: () => api.get('/areas/'),
  get: (id) => api.get(`/areas/${id}/`),
  create: (data) => api.post('/areas/', data),
  update: (id, data) => api.put(`/areas/${id}/`, data),
  delete: (id) => api.delete(`/areas/${id}/`),
};

export const collectionAPI = {
  getAll: () => api.get('/collections/'),
  get: (id) => api.get(`/collections/${id}/`),
  create: (data) => api.post('/collections/', data),
  update: (id, data) => api.put(`/collections/${id}/`, data),
  delete: (id) => api.delete(`/collections/${id}/`),
};

export const subcollectionAPI = {
  getAll: () => api.get('/subcollections/'),
  get: (id) => api.get(`/subcollections/${id}/`),
  create: (data) => api.post('/subcollections/', data),
  update: (id, data) => api.put(`/subcollections/${id}/`, data),
  delete: (id) => api.delete(`/subcollections/${id}/`),
};

export const obligationAPI = {
  getAll: () => api.get('/obligations/'),
  get: (id) => api.get(`/obligations/${id}/`),
  create: (data) => api.post('/obligations/', data),
  bulkCreate: (data) => api.post('/obligations/bulk_create/', data),
  bulkPay: (data) => api.patch('/obligations/bulk_pay/', data),
  update: (id, data) => api.put(`/obligations/${id}/`, data),
  partialUpdate: (id, data) => api.patch(`/obligations/${id}/`, data),
  delete: (id) => api.delete(`/obligations/${id}/`),
  search: (params) => api.get('/obligations/search/', { params }),
  statistics: (subcollectionId) => api.get('/obligations/statistics/', {
    params: { subcollection: subcollectionId }
  }),
  exportData: () => api.post('/obligations/export_data/', {}, {
    responseType: 'blob',
  }),
  importData: (formData) => api.post('/obligations/import_data/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export const eventAPI = {
  getAll: () => api.get('/events/'),
  get: (id) => api.get(`/events/${id}/`),
  create: (data) => api.post('/events/', data),
  update: (id, data) => api.put(`/events/${id}/`, data),
  delete: (id) => api.delete(`/events/${id}/`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/'),
};

export const todoAPI = {
  getAll: () => api.get('/todos/'),
  get: (id) => api.get(`/todos/${id}/`),
  create: (data) => api.post('/todos/', data),
  update: (id, data) => api.put(`/todos/${id}/`, data),
  delete: (id) => api.delete(`/todos/${id}/`),
};

export const settingsAPI = {
  getAll: () => api.get('/settings/'),
  get: (id) => api.get(`/settings/${id}/`),
  create: (data) => api.post('/settings/', data),
  update: (id, data) => api.put(`/settings/${id}/`, data),
  delete: (id) => api.delete(`/settings/${id}/`),
};

export const recentActionsAPI = {
  getAll: (params) => api.get('/recent-actions/', { params }),
  update: (id, data) => api.patch(`/recent-actions/${id}/`, data),
};



// Export the api instance as well
export { api };
export default api;