import API from "./axios";

export const getMembers = () =>
  API.get("members/profiles/");

export const markAttendance = (data) =>
  API.post("members/attendance/bulk-mark/", data);
