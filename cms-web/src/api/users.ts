import API, { getErrorMessage } from "./client";
import type { User } from "../types";
import { toList } from "./utils";

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await API.get<User[] | { results: User[] }>("accounts/users/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch users."));
  }
};

export const assignLeadershipRole = async (userId: number, role: "fellowship_leader" | "cell_leader"): Promise<User> => {
  try {
    const response = await API.patch<User>(`accounts/users/${userId}/`, { role });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to assign leadership role."));
  }
};

export interface LeaderCredentialsResponse {
  username: string;
  temporary_password: string | null;
  role: "fellowship_leader" | "cell_leader";
}

export const assignCellLeader = async (payload: {
  member_id: number;
  cell_id: number;
}): Promise<LeaderCredentialsResponse> => {
  try {
    const response = await API.post<LeaderCredentialsResponse>("accounts/assign-cell-leader/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to assign cell leader."));
  }
};

export const assignFellowshipLeader = async (payload: {
  member_id: number;
  fellowship_id: number;
}): Promise<LeaderCredentialsResponse> => {
  try {
    const response = await API.post<LeaderCredentialsResponse>("accounts/assign-fellowship-leader/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to assign fellowship leader."));
  }
};

export const createLeader = async (payload: {
  role: "fellowship_leader" | "cell_leader";
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  fellowship_id?: number;
  cell_id?: number;
}): Promise<LeaderCredentialsResponse> => {
  try {
    const response = await API.post<LeaderCredentialsResponse>("accounts/create-leader/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create leader account."));
  }
};
