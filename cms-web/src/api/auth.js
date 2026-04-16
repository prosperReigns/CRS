import API from "./axios";

export const loginUser = (data) => API.post("auth/login/", data);
export const refreshToken = (refresh) => API.post("auth/refresh/", { refresh });
export const getCurrentUser = () => API.get("accounts/users/me/");
