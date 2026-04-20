import API, { getErrorMessage } from "./client";
import type { ScheduleEvent, TodoItem } from "../types";
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

export interface TodoItemPayload {
  title: string;
  description?: string;
  due_date?: string | null;
  priority?: TodoItem["priority"];
  is_completed?: boolean;
}

export const getTodoItems = async (completed?: boolean): Promise<TodoItem[]> => {
  try {
    const response = await API.get<TodoItem[] | { results: TodoItem[] }>("scheduling/todos/", {
      params: completed === undefined ? undefined : { completed },
    });
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch todo items."));
  }
};

export const createTodoItem = async (payload: TodoItemPayload): Promise<TodoItem> => {
  try {
    const response = await API.post<TodoItem>("scheduling/todos/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create todo item."));
  }
};

export const updateTodoItem = async (todoId: number, payload: Partial<TodoItemPayload>): Promise<TodoItem> => {
  try {
    const response = await API.patch<TodoItem>(`scheduling/todos/${todoId}/`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update todo item."));
  }
};

export const deleteTodoItem = async (todoId: number): Promise<void> => {
  try {
    await API.delete(`scheduling/todos/${todoId}/`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to delete todo item."));
  }
};
