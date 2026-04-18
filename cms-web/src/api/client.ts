import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig } from "axios";

type UnauthorizedHandler = (() => void) | null;

interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export interface ApiErrorShape {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api/";

const normalizedBaseUrl = configuredBaseUrl.endsWith("/")
  ? configuredBaseUrl
  : `${configuredBaseUrl}/`;

const API = axios.create({
  baseURL: normalizedBaseUrl,
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
  const extractMessage = (value: unknown): string | undefined => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const message = extractMessage(item);
        if (message) return message;
      }
      return undefined;
    }
    if (value && typeof value === "object") {
      for (const nestedValue of Object.values(value)) {
        const message = extractMessage(nestedValue);
        if (message) return message;
      }
    }
    return undefined;
  };

  const apiError = error as AxiosError<ApiErrorShape>;
  const responseData = apiError.response?.data;
  if (!responseData) return fallback;

  if (typeof responseData.detail === "string") {
    return responseData.detail;
  }
  if (Array.isArray(responseData.non_field_errors) && responseData.non_field_errors[0]) {
    return responseData.non_field_errors[0];
  }

  return extractMessage(responseData) || fallback;
};

API.interceptors.request.use((config) => {
  const access = localStorage.getItem("accessToken");
  if (access) {
    const headers = AxiosHeaders.from(config.headers || {});
    headers.set("Authorization", `Bearer ${access}`);
    config.headers = headers;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;
    const status = error.response?.status;
    const refreshToken = localStorage.getItem("refreshToken");
    const responseData = error.response?.data as ApiErrorShape | undefined;

    if (responseData && responseData.is_frozen === true) {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser);
          parsedUser.is_frozen = true;
          localStorage.setItem("user", JSON.stringify(parsedUser));
        } catch {
          // ignore parsing errors
        }
      }
      if (window.location.pathname !== "/reports/submit") {
        window.location.assign("/reports/submit");
      }
    }

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
          const headers = AxiosHeaders.from(
            (originalRequest.headers || {}) as AxiosHeaders | Record<string, string>
          );
          headers.set("Authorization", `Bearer ${newAccess}`);
          originalRequest.headers = headers;
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
