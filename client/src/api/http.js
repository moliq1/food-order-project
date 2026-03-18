import axios from "axios";
import { ElMessage } from "element-plus";

const http = axios.create({
  baseURL: "/api",
  timeout: 10000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("food-order-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || "请求失败";
    if (error.response?.status === 401) {
      localStorage.removeItem("food-order-token");
      localStorage.removeItem("food-order-user");
      if (location.pathname !== "/login") {
        location.href = "/login";
      }
    }
    ElMessage.error(message);
    return Promise.reject(error);
  }
);

export default http;
