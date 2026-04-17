import API, { getErrorMessage } from "./client";
import type { User } from "../types";

export interface UserSettings extends User {
  cell_meeting_venue?: string;
}

export interface UpdateSettingsPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  cell_meeting_venue?: string;
  profile_picture?: File;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    const response = await API.get<UserSettings>("accounts/users/settings/");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch user settings."));
  }
};

export const updateUserSettings = async (payload: UpdateSettingsPayload): Promise<UserSettings> => {
  try {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, value);
    });

    const response = await API.patch<UserSettings>("accounts/users/settings/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update user settings."));
  }
};

export const changePassword = async (payload: ChangePasswordPayload): Promise<string> => {
  try {
    const response = await API.post<{ detail: string }>("accounts/users/change-password/", payload);
    return response.data.detail || "Password updated successfully.";
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update password."));
  }
};
