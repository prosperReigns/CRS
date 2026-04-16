import API from "./axios";

const unwrapError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  throw new Error(detail || fallback);
};

export const getDashboardData = async () => {
  try {
    const response = await API.get("reports/analytics/");
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to load dashboard analytics.");
  }
};
