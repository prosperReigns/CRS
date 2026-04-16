import axios, { AxiosError } from "axios";

type UnauthorizedHandler = (() => void) | null;

export interface ApiErrorShape {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/",
});

let onUnauthorized: UnauthorizedHandler = null;

const clearAuthStorage = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

export const registerUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  onUnauthorized = handler;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = error as AxiosError<ApiErrorShape>;
  const responseData = apiError.response?.data;
  if (!responseData) return fallback;

  if (typeof responseData.detail === "string") {
    return responseData.detail;
  }
  if (Array.isArray(responseData.non_field_errors) && responseData.non_field_errors[0]) {
    return responseData.non_field_errors[0];
  }

  const fieldError = Object.values(responseData).find((value) => typeof value === "string");
  return (fieldError as string) || fallback;
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
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const refreshToken = localStorage.getItem("refreshToken");

    if (
      status === 401 &&
      refreshToken &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes("auth/refresh/")
    ) {
      if (originalRequest) originalRequest._retry = true;
      try {
        const response = await axios.post(`${API.defaults.baseURL}auth/refresh/`, { refresh: refreshToken });
        const newAccess = (response.data as { access: string }).access;
        localStorage.setItem("accessToken", newAccess);
        if (originalRequest) {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newAccess}`,
          };
          return API(originalRequest);
        }
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
