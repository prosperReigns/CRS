export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: "pastor" | "staff" | "fellowship_leader" | "cell_leader" | "teacher" | "member";
}

export interface MemberProfile {
  id: number;
  user: User;
  cell: number | null;
  cell_name: string;
  is_baptised: boolean;
  foundation_completed: boolean;
  is_partner: boolean;
  souls_won: number;
  join_date: string;
  last_attended: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportImage {
  id: number;
  image: string;
  uploaded_at: string;
}

export interface ReportComment {
  id: number;
  author: Pick<User, "id" | "username" | "first_name" | "last_name" | "role">;
  comment: string;
  created_at: string;
}

export interface CellReport {
  id: number;
  cell: number;
  cell_name: string;
  submitted_by: number;
  author: Pick<User, "id" | "username" | "first_name" | "last_name" | "role">;
  meeting_date: string;
  attendance_count: number;
  new_members: number;
  offering_amount: string;
  summary: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  reviewed_by: number | null;
  approved_by: number | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  images: ReportImage[];
  comments: ReportComment[];
}

export interface Attendance {
  id: number;
  member: number;
  member_name: string;
  date: string;
  service_type: string;
  present: boolean;
}

export interface Message {
  id: number;
  sender: Pick<User, "id" | "username">;
  receiver: Pick<User, "id" | "username">;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsResponse {
  members: { total: number; active: number; inactive: number };
  report_stats: { total: number; approved: number; rejected: number };
  offering_total: number;
  souls_won: number;
  attendance_trend: Array<{ date: string; count: number }>;
  offering_trend: Array<{ meeting_date: string; total: number }>;
}

export interface AttendanceBulkRequest {
  date: string;
  service_type: "sunday" | "midweek" | "special";
  members: number[];
  present?: boolean;
}
