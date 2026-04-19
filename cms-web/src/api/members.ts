import API, { getErrorMessage } from "./client";
import type {
  AttendanceBulkRequest,
  AttendanceBulkResponse,
  ChurchService,
  FirstTimerEvent,
  Member,
  Person,
  VisitationReport,
} from "../types";
import { toList } from "./utils";

export const getMembers = async (): Promise<Member[]> => {
  try {
    const response = await API.get<Member[] | { results: Member[] }>("members/profiles/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch members."));
  }
};

export const getMemberProfile = async (memberId: number): Promise<Member> => {
  try {
    const response = await API.get<Member>(`members/profiles/${memberId}/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch member profile."));
  }
};

export interface CreateMemberProfilePayload {
  user_id: number;
  cell?: number | null;
  membership_status?: "visitor" | "first_timer" | "regular" | "member";
  is_first_timer?: boolean;
  first_visit_date?: string | null;
  follow_up_status?: string;
  visitation_notes?: string;
}

export const createMemberProfile = async (payload: CreateMemberProfilePayload): Promise<Member> => {
  try {
    const response = await API.post<Member>("members/profiles/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create member profile."));
  }
};

export const updateMemberProfile = async (
  memberId: number,
  data: Partial<Pick<Member, "is_baptised" | "foundation_completed" | "souls_won">>
): Promise<Member> => {
  try {
    const response = await API.patch<Member>(`members/profiles/${memberId}/`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update member profile."));
  }
};

export const markAttendance = async (data: AttendanceBulkRequest): Promise<AttendanceBulkResponse> => {
  try {
    const payload: {
      date: string;
      service_id: number;
      people: number[];
      present?: boolean;
    } = {
      date: data.date,
      service_id: data.service_id,
      people: data.people || data.members || [],
    };
    if (typeof data.present === "boolean") {
      payload.present = data.present;
    }
    const response = await API.post<AttendanceBulkResponse>("members/attendance/bulk-mark/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark attendance."));
  }
};

export const getPeople = async (params?: {
  membership_status?: "visitor" | "first_timer" | "regular" | "member";
}): Promise<Person[]> => {
  try {
    const response = await API.get<Person[] | { results: Person[] }>("members/people/", { params });
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch people."));
  }
};

export const createPerson = async (
  payload: Pick<Person, "first_name" | "last_name" | "phone" | "email">
): Promise<Person> => {
  try {
    const response = await API.post<Person>("members/people/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create person."));
  }
};

export const getServices = async (): Promise<ChurchService[]> => {
  try {
    const response = await API.get<ChurchService[]>("services/");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch services."));
  }
};

export const getFirstTimers = async (): Promise<Member[]> => {
  try {
    const response = await API.get<Member[] | { results: Member[] }>("members/profiles/first-timers/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch first timers."));
  }
};

export const getServiceFirstTimerEvents = async (): Promise<FirstTimerEvent[]> => {
  try {
    const response = await API.get<FirstTimerEvent[] | { results: FirstTimerEvent[] }>(
      "members/first-timer-events/",
      { params: { event_type: "service" } }
    );
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch first timer events."));
  }
};

export const updateFirstTimerEvent = async (
  eventId: number,
  data: Partial<Pick<FirstTimerEvent, "handled">>
): Promise<FirstTimerEvent> => {
  try {
    const response = await API.patch<FirstTimerEvent>(`members/first-timer-events/${eventId}/`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update first timer event."));
  }
};

export const updateFirstTimerFollowUp = async (
  memberId: number,
  data: Partial<
    Pick<
      Member,
      "first_visit_date" | "follow_up_status" | "visitation_notes" | "visitation_fellowship_leader" | "visitation_cell_leader"
    >
  >
): Promise<Member> => {
  try {
    const response = await API.patch<Member>(`members/profiles/${memberId}/first-timer-follow-up/`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update first timer follow-up."));
  }
};

export const getPartners = async (): Promise<Member[]> => {
  try {
    const response = await API.get<Member[] | { results: Member[] }>("members/profiles/partners/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch partners."));
  }
};

export const updatePartnerProfile = async (
  memberId: number,
  data: Partial<Pick<Member, "is_partner" | "partnership_date" | "partnership_level">>
): Promise<Member> => {
  try {
    const response = await API.patch<Member>(`members/profiles/${memberId}/partnership/`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update partnership profile."));
  }
};

export const getAssignedVisitationFirstTimers = async (): Promise<Member[]> => {
  try {
    const response = await API.get<Member[] | { results: Member[] }>("members/profiles/assigned-visitation-first-timers/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch assigned first timers."));
  }
};

export const getVisitationReports = async (): Promise<VisitationReport[]> => {
  try {
    const response = await API.get<VisitationReport[] | { results: VisitationReport[] }>("members/visitation-reports/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch visitation reports."));
  }
};

export const submitVisitationReport = async (
  payload: Pick<VisitationReport, "member" | "visitation_date" | "visitation_time" | "method_used" | "comment">
): Promise<VisitationReport> => {
  try {
    const response = await API.post<VisitationReport>("members/visitation-reports/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to submit visitation report."));
  }
};

export const approveVisitationReport = async (reportId: number): Promise<VisitationReport> => {
  try {
    const response = await API.patch<VisitationReport>(`members/visitation-reports/${reportId}/approve/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to approve visitation report."));
  }
};
