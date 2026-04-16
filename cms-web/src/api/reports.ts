import API, { getErrorMessage } from "./client";
import type { Report, ReportComment } from "../types";
import { toList } from "./utils";

export const createReport = async (formData: FormData): Promise<Report> => {
  try {
    const response = await API.post<Report>("reports/reports/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to submit report."));
  }
};

export const getMyReports = async (): Promise<Report[]> => {
  try {
    const response = await API.get<Report[] | { results: Report[] }>("reports/reports/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load your reports."));
  }
};

export const getReports = async (): Promise<Report[]> => {
  try {
    const response = await API.get<Report[] | { results: Report[] }>("reports/reports/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load reports."));
  }
};

export const approveReport = async (id: number): Promise<Report> => {
  try {
    const response = await API.patch<Report>(`reports/reports/${id}/approve/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to approve report."));
  }
};

export const rejectReport = async (id: number): Promise<Report> => {
  try {
    const response = await API.patch<Report>(`reports/reports/${id}/reject/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to reject report."));
  }
};

export const reviewReport = async (id: number): Promise<Report> => {
  try {
    const response = await API.patch<Report>(`reports/reports/${id}/review/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to review report."));
  }
};

export const addComment = async (id: number, comment: { comment: string }): Promise<ReportComment> => {
  try {
    const response = await API.post<ReportComment>(`reports/reports/${id}/comment/`, comment);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to add report comment."));
  }
};
