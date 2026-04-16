import API, { getErrorMessage } from "./client";
import type { User } from "../types";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RefreshResponse {
  access: string;
}

export const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await API.post<LoginResponse>("auth/login/", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Login failed."));
  }
};

export const refreshToken = async (refresh: string): Promise<RefreshResponse> => {
  try {
    const response = await API.post<RefreshResponse>("auth/refresh/", { refresh });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Token refresh failed."));
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await API.get<User>("accounts/users/me/");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch current user."));
  }
};
