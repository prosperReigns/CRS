import API from "./axios";

const toList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const unwrapError = (error, fallback) => {
  const detail = error?.response?.data?.detail || error?.response?.data?.member_ids;
  throw new Error(detail || fallback);
};

export const getMembers = async () => {
  try {
    const response = await API.get("members/profiles/");
    return toList(response.data);
  } catch (error) {
    unwrapError(error, "Failed to fetch members.");
  }
};

export const markAttendance = async (data) => {
  try {
    const payload = {
      date: data.date,
      service_type: data.service_type,
      members: data.members || data.member_ids || [],
    };
    if (typeof data.present === "boolean") {
      payload.present = data.present;
    }
    const response = await API.post("members/attendance/bulk-mark/", payload);
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to mark attendance.");
  }
};
