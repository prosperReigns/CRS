import API from "./axios";

const unwrapError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  throw new Error(detail || fallback);
};

export const loginUser = async (data) => {
  try {
    const response = await API.post("auth/login/", data);
    return response.data;
  } catch (error) {
    unwrapError(error, "Login failed.");
  }
};

export const refreshToken = async (refresh) => {
  try {
    const response = await API.post("auth/refresh/", { refresh });
    return response.data;
  } catch (error) {
    unwrapError(error, "Token refresh failed.");
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await API.get("accounts/users/me/");
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to fetch current user.");
  }
};
