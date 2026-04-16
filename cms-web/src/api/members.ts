import API, { getErrorMessage } from "./client";
import type { AttendanceBulkRequest, AttendanceBulkResponse, Member } from "../types";

const toList = <T>(payload: T[] | { results?: T[] }): T[] => (Array.isArray(payload) ? payload : payload?.results || []);

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
    const payload = {
      date: data.date,
      service_type: data.service_type,
      members: data.members || [],
      present: typeof data.present === "boolean" ? data.present : true,
    };
    const response = await API.post<AttendanceBulkResponse>("members/attendance/bulk-mark/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark attendance."));
  }
};
