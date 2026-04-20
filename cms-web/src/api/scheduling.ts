import API, { getErrorMessage } from "./client";
import type { ScheduleEvent } from "../types";
import { toList } from "./utils";

export interface ScheduleEventPayload {
  title: string;
  description?: string;
  location?: string;
  start_datetime: string;
  end_datetime: string;
  all_day?: boolean;
  event_type?: ScheduleEvent["event_type"];
  participants?: number[];
}

export const getScheduleEvents = async (start?: string, end?: string): Promise<ScheduleEvent[]> => {
  try {
    const response = await API.get<ScheduleEvent[] | { results: ScheduleEvent[] }>("scheduling/events/", {
      params: {
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
      },
    });
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch schedule events."));
  }
};

export const createScheduleEvent = async (payload: ScheduleEventPayload): Promise<ScheduleEvent> => {
  try {
    const response = await API.post<ScheduleEvent>("scheduling/events/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create schedule event."));
  }
};

export const updateScheduleEvent = async (eventId: number, payload: ScheduleEventPayload): Promise<ScheduleEvent> => {
  try {
    const response = await API.put<ScheduleEvent>(`scheduling/events/${eventId}/`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update schedule event."));
  }
};

export const deleteScheduleEvent = async (eventId: number): Promise<void> => {
  try {
    await API.delete(`scheduling/events/${eventId}/`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to delete schedule event."));
  }
};
