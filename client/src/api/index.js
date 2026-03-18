import http from "./http";

export const authApi = {
  login: (payload) => http.post("/auth/login", payload),
  profile: () => http.get("/auth/profile")
};

export const dishApi = {
  list: () => http.get("/dishes"),
  detail: (id) => http.get(`/dishes/${id}`)
};

export const orderApi = {
  create: (payload) => http.post("/orders", payload),
  search: (params) => http.get("/orders", { params }),
  detail: (id) => http.get(`/orders/${id}`),
  cancel: (id) => http.post(`/orders/${id}/cancel`)
};

export const adminApi = {
  categories: () => http.get("/admin/categories"),
  createCategory: (payload) => http.post("/admin/categories", payload),
  updateCategory: (id, payload) => http.put(`/admin/categories/${id}`, payload),
  deleteCategory: (id) => http.delete(`/admin/categories/${id}`),
  dishes: () => http.get("/admin/dishes"),
  createDish: (payload) => http.post("/admin/dishes", payload),
  updateDish: (id, payload) => http.put(`/admin/dishes/${id}`, payload),
  toggleDish: (id) => http.patch(`/admin/dishes/${id}/availability`),
  deleteDish: (id) => http.delete(`/admin/dishes/${id}`),
  orders: (params) => http.get("/admin/orders", { params }),
  orderDetail: (id) => http.get(`/admin/orders/${id}`),
  acceptOrder: (id) => http.post(`/admin/orders/${id}/accept`),
  rejectOrder: (id) => http.post(`/admin/orders/${id}/reject`),
  completeOrder: (id) => http.post(`/admin/orders/${id}/complete`),
  cancelOrder: (id) => http.post(`/admin/orders/${id}/cancel`),
  stats: () => http.get("/admin/stats"),
  upload: (formData) =>
    http.post("/admin/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
};
