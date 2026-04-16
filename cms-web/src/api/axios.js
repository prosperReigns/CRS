import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/",
});

let onUnauthorized = null;

const clearAuthStorage = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

export const registerUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

API.interceptors.request.use((config) => {
  const access = localStorage.getItem("accessToken");
  if (access) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${access}`,
    };
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const refreshToken = localStorage.getItem("refreshToken");

    if (
      status === 401 &&
      refreshToken &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes("auth/refresh/")
    ) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(`${API.defaults.baseURL}auth/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = response.data.access;
        localStorage.setItem("accessToken", newAccess);
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccess}`,
        };
        return API(originalRequest);
      } catch (refreshError) {
        clearAuthStorage();
        if (onUnauthorized) {
          onUnauthorized();
        } else if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
