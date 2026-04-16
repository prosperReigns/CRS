import API from "./axios";

export const getDashboardData = () =>
  API.get("reports/analytics/");