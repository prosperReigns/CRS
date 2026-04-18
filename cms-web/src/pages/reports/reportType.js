export const REPORT_TYPE_OPTIONS = [
  { value: "week1_prayer_planning", label: "Week 1 - Prayer and Planning" },
  { value: "week2_bible_study", label: "Week 2 - Bible Study" },
  { value: "week3_bible_study", label: "Week 3 - Bible Study" },
  { value: "week4_outreach", label: "Week 4 - Outreach" },
];

export const getReportTypeLabel = (type) => REPORT_TYPE_OPTIONS.find((option) => option.value === type)?.label || "-";

const parseDayOfMonth = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue.getDate();
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue));
  if (isoMatch) {
    return Number(isoMatch[3]);
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getDate();
};

export const inferReportTypeFromDate = (dateValue) => {
  const day = parseDayOfMonth(dateValue);
  if (!day || day < 1) return "";
  // Keep this in sync with backend/apps/reports/models.py infer_report_type.
  const weekOfMonth = Math.floor((day - 1) / 7) + 1;
  if (weekOfMonth <= 1) return "week1_prayer_planning";
  if (weekOfMonth === 2) return "week2_bible_study";
  if (weekOfMonth === 3) return "week3_bible_study";
  return "week4_outreach";
};
