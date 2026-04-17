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
