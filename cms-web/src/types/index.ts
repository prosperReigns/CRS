export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role: string;
}

export interface Member {
  id: number;
  user: User;
  cell: number | null;
  cell_name?: string;
  is_baptised: boolean;
  foundation_completed: boolean;
  is_partner: boolean;
  souls_won: number;
  join_date: string;
  last_attended: string | null;
}

export interface ReportImage {
  id: number;
  image: string;
  uploaded_at: string;
}

export interface Comment {
  id: number;
  author: number;
  author_username: string;
  comment: string;
  created_at: string;
}

export interface Report {
  id: number;
  cell: number;
  meeting_date: string;
  attendance_count: number;
  new_members: number;
  offering_amount: string;
  summary: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  images: ReportImage[];
  comments: Comment[];
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
  sender: number;
  sender_username: string;
  recipient: number;
  recipient_username: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsResponse {
  members: { total: number; active: number; inactive: number };
  member_activity_stats: { total: number; active: number; inactive: number };
  reports: { total: number; approved: number; rejected: number };
  report_stats: { total: number; approved: number; rejected: number };
  offering_total: number;
  souls_won: number;
  attendance_trend: Array<{ week: string; count: number }>;
  offering_trend: Array<{ week: string; total: number }>;
}
