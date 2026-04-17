import API, { getErrorMessage } from "./client";
import type { NotificationItem } from "../types";
import { toList } from "./utils";

export const getNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const response = await API.get<NotificationItem[] | { results: NotificationItem[] }>(
      "communication/notifications/"
    );
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load notifications."));
  }
};

export const markNotificationRead = async (id: number): Promise<void> => {
  try {
    await API.patch(`communication/notifications/${id}/mark-read/`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark notification as read."));
  }
};

export const markAllNotificationsRead = async (): Promise<void> => {
  try {
    await API.patch("communication/notifications/mark-all-read/");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark all notifications as read."));
  }
};
