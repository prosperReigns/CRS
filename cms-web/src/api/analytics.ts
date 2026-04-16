import API, { getErrorMessage } from "./client";
import type { AnalyticsResponse } from "../types";

export const getDashboardData = async (): Promise<AnalyticsResponse> => {
  try {
    const response = await API.get<AnalyticsResponse>("reports/analytics/");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load dashboard analytics."));
  }
};
