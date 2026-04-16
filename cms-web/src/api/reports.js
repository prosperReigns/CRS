import API from "./axios";

export const createReport = (formData) =>
  API.post("reports/reports/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMyReports = () =>
  API.get("reports/reports/");

export const approveReport = (id) =>
  API.patch(`reports/reports/${id}/approve/`);

export const rejectReport = (id) =>
  API.patch(`reports/reports/${id}/reject/`);

export const reviewReport = (id) =>
  API.patch(`reports/reports/${id}/review/`);

export const addComment = (id, data) =>
  API.post(`reports/reports/${id}/comment/`, data);