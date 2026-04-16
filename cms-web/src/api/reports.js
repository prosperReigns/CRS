import API from "./axios";

const toList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const unwrapError = (error, fallback) => {
  const detail = error?.response?.data?.detail || error?.response?.data?.non_field_errors?.[0];
  throw new Error(detail || fallback);
};

export const createReport = async (formData) => {
  try {
    const response = await API.post("reports/reports/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to submit report.");
  }
};

export const getMyReports = async () => {
  try {
    const response = await API.get("reports/reports/");
    return toList(response.data);
  } catch (error) {
    unwrapError(error, "Failed to load your reports.");
  }
};

export const getReports = async () => {
  try {
    const response = await API.get("reports/reports/");
    return toList(response.data);
  } catch (error) {
    unwrapError(error, "Failed to load reports.");
  }
};

export const approveReport = async (id) => {
  try {
    const response = await API.patch(`reports/reports/${id}/approve/`);
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to approve report.");
  }
};

export const rejectReport = async (id) => {
  try {
    const response = await API.patch(`reports/reports/${id}/reject/`);
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to reject report.");
  }
};

export const reviewReport = async (id) => {
  try {
    const response = await API.patch(`reports/reports/${id}/review/`);
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to review report.");
  }
};

export const addComment = async (id, data) => {
  try {
    const response = await API.post(`reports/reports/${id}/comment/`, data);
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to add report comment.");
  }
};
