import API from "./axios";

export const getMembers = () =>
  API.get("members/members/");

export const markAttendance = (data) =>
  API.post("members/attendance/bulk_mark/", data);