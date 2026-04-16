import API, { getErrorMessage } from "./client";
import type { AttendanceBulkRequest, AttendanceBulkResponse, ChurchService, Member } from "../types";
import { toList } from "./utils";

export const getMembers = async (): Promise<Member[]> => {
  try {
    const response = await API.get<Member[] | { results: Member[] }>("members/profiles/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch members."));
  }
};

export const markAttendance = async (data: AttendanceBulkRequest): Promise<AttendanceBulkResponse> => {
  try {
    const payload: {
      date: string;
      service_id: number;
      members: number[];
      present?: boolean;
    } = {
      date: data.date,
      service_id: data.service_id,
      members: data.members || [],
    };
    if (typeof data.present === "boolean") {
      payload.present = data.present;
    }
    const response = await API.post<AttendanceBulkResponse>("members/attendance/bulk-mark/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark attendance."));
  }
};

export const getServices = async (): Promise<ChurchService[]> => {
  try {
    const response = await API.get<ChurchService[]>("services/");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch services."));
  }
};
