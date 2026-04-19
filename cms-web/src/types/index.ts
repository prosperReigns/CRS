export interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | "" | null;
  email: string | null;
  phone: string | null;
  home_address?: string | null;
  bio?: string | null;
  profile_picture?: string | null;
  role: "admin" | "pastor" | "staff" | "fellowship_leader" | "cell_leader" | "teacher" | "member";
  responsibilities?: string[];
  is_frozen?: boolean;
  is_active?: boolean;
  date_joined?: string;
}

export interface StaffResponsibility {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface Member {
  id: number;
  user: User;
  cell: number | null;
  cell_name: string | null;
   membership_status: "visitor" | "first_timer" | "regular" | "member";
   attendance_count: number;
  is_baptised: boolean;
  foundation_completed: boolean;
  is_first_timer: boolean;
  first_visit_date: string | null;
  follow_up_status: string;
  visitation_notes: string;
  visitation_fellowship_leader: number | null;
  visitation_cell_leader: number | null;
  is_partner: boolean;
  partnership_date: string | null;
  partnership_level: string;
  souls_won: number;
  join_date: string;
  last_attended: string | null;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  created_at: string;
  membership_status: "visitor" | "first_timer" | "regular" | "member";
  attendance_count: number;
  is_member: boolean;
  cell_name?: string | null;
}

export interface VisitationReport {
  id: number;
  member: number;
  member_name: string;
  assigned_leader: number;
  leader_name: string;
  visitation_date: string;
  visitation_time: string;
  method_used: "calling" | "one_on_one_visitation";
  comment: string;
  status: "pending" | "approved";
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Fellowship {
  id: number;
  name: string;
  leader: number | null;
  created_at: string;
}

export interface Cell {
  id: number;
  name: string;
  fellowship: number;
  fellowship_name?: string;
  leader: number | null;
  meeting_day: string;
  meeting_time: string | null;
  venue: string;
  created_at: string;
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

export interface ReportActivityLog {
  id: number;
  action: "created" | "reviewed" | "approved" | "rejected" | "commented";
  note: string;
  actor: number | null;
  actor_username: string | null;
  created_at: string;
}

export interface Report {
  id: number;
  cell: number;
  cell_name: string;
  fellowship_name?: string;
  submitted_by: number;
  author: Pick<User, "id" | "username" | "first_name" | "last_name" | "role">;
  meeting_date: string;
  meeting_time?: string | null;
  meeting_duration_minutes?: number | null;
  report_type: "week1_prayer_planning" | "week2_bible_study" | "week3_bible_study" | "week4_outreach";
  attendees: ReportAttendee[];
  first_timer_attendees?: ReportAttendee[];
  attendance_count: number;
  attendee_names?: string;
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
  activity_logs: ReportActivityLog[];
}

export interface ReportAttendee {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  membership_status?: "visitor" | "first_timer" | "regular" | "member";
  cell_name?: string | null;
}

export interface Attendance {
  id: number;
  person: number | null;
  person_name?: string | null;
  member: number | null;
  member_name: string | null;
  date: string;
  service: number | null;
  service_name?: string | null;
  service_type: "sunday" | "midweek" | "special";
  present: boolean;
  recorded_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChurchService {
  id: number;
  name: string;
  day_of_week: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
}

export interface Message {
  id: number;
  sender: Pick<User, "id" | "username">;
  receiver: Pick<User, "id" | "username">;
  sender_id: number;
  recipient_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partner: Pick<User, "id" | "username" | "role">;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: "report" | "message" | "announcement";
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsResponse {
  members: { total: number; active: number; inactive: number };
  membership?: { strength: number; visitors: number; first_timers: number; growth_rate?: number };
  report_stats: { total: number; approved: number; rejected: number };
  offering_total: number;
  souls_won: number;
  attendance_trend: Array<{ date: string; count: number }>;
  services?: Array<{ service_id: number; name: string; attendance: number }>;
  daily_total_attendance?: Array<{ date: string; attendance: number }>;
  offering_trend: Array<{ meeting_date: string; total: number }>;
  top_cells: Array<{
    cell_id: number;
    cell_name: string;
    report_count: number;
    total_attendance: number;
    total_offering: number;
    member_count?: number;
    visitor_count?: number;
    first_timer_count?: number;
  }>;
}

export interface AttendanceBulkRequest {
  date: string;
  service_id: number;
  people?: number[];
  members?: number[];
  present?: boolean;
}

export interface AttendanceBulkResponse {
  date: string;
  service_id: number;
  service_name?: string;
  requested: number;
  created: number;
  duplicates: number;
}

export type MemberProfile = Member;
export type CellReport = Report;
