import apiClient from "@/lib/api/client";
import type { ApiResponse, VolunteerRegistrationsDownload } from "@/lib/api/types";

// ─── Registrations ───────────────────────────────────────────────────────────

export const registerForVolunteerOpportunity = (data: any) =>
  apiClient.post("/volunteer-opportunity-registrations/", data).then((r) => r.data);

export const unregisterFromVolunteerOpportunity = (id: string) =>
  apiClient.delete(`/volunteer-opportunities/${id}/unregister/`).then((r) => r.data);

/** Creator-only: stop accepting registrations before the due date is reached. */
export const closeVolunteerOpportunityRegistration = (id: string) =>
  apiClient.post(`/volunteer-opportunities/${id}/close-registration/`).then((r) => r.data);

/** Creator-only: reopen registration after closing it early. */
export const reopenVolunteerOpportunityRegistration = (id: string) =>
  apiClient.post(`/volunteer-opportunities/${id}/reopen-registration/`).then((r) => r.data);

/** Creator-only: send a rejected opportunity back into the admin review queue. */
export const resubmitVolunteerOpportunity = (id: string) =>
  apiClient.post(`/volunteer-opportunities/${id}/resubmit/`).then((r) => r.data);

export const updateVolunteerRegistration = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/volunteer-opportunity-registrations/`, data).then((r) => r.data);

/**
 * Team and role filters go over the wire as repeated `team_id` / `role_id`
 * params, so they're built by hand rather than left to axios' array encoding.
 */
export const getVolunteerRegistrations = ({
  opportunity_id,
  page = 1,
  limit = 10,
  teams,
  roles,
  search,
}: {
  opportunity_id?: string;
  page?: number;
  limit?: number;
  teams?: number[];
  roles?: number[];
  search?: string;
}) => {
  const params = new URLSearchParams();
  params.append("opportunity_id", String(opportunity_id ?? ""));
  params.append("page", String(page));
  params.append("limit", String(limit));
  teams?.forEach((team) => params.append("team_id", String(team)));
  roles?.forEach((role) => params.append("role_id", String(role)));
  if (search) params.append("search", search);

  return apiClient
    .get("/volunteer-opportunity-registrations/", { params })
    .then((r) => r.data);
};

export const downloadVolunteerRegistrations = ({
  opportunity_id,
  teams,
  roles,
  search,
  mark_attendance,
  date,
}: {
  opportunity_id: string;
  teams?: number[];
  roles?: number[];
  search?: string;
  mark_attendance?: boolean;
  date?: string;
}): Promise<VolunteerRegistrationsDownload> => {
  const params = new URLSearchParams();
  params.append("opportunity_id", opportunity_id);
  params.append("download", "true");
  teams?.forEach((team) => params.append("team_id", String(team)));
  roles?.forEach((role) => params.append("role_id", String(role)));
  if (search) params.append("search", search);
  if (mark_attendance) params.append("mark_attendance", "true");
  if (date) params.append("date", date);

  return apiClient
    .get<ApiResponse<VolunteerRegistrationsDownload>>(
      "/volunteer-opportunity-registrations/",
      { params }
    )
    .then((r) => r.data.data);
};

export const directRegisterVolunteer = (data: any) =>
  apiClient.post("/volunteer-opportunity-registrations/direct-register/", data).then((r) => r.data);

export const directUnregisterVolunteer = (data: any) =>
  apiClient.post("/volunteer-opportunity-registrations/direct-unregister/", data).then((r) => r.data);

// ─── Teams ───────────────────────────────────────────────────────────────────

export const getTeams = (params?: any) =>
  apiClient.get("/volunteer-opportunity-teams/", { params }).then((r) => r.data);

export const createTeam = (data: any) =>
  apiClient.post("/volunteer-opportunity-teams/", data).then((r) => r.data);

export const updateTeam = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/volunteer-opportunity-teams/${id}/`, data).then((r) => r.data);

export const deleteTeam = (id: string) =>
  apiClient.delete(`/volunteer-opportunity-teams/${id}/`).then((r) => r.data);

export const getTeamById = (id: string) =>
  apiClient.get(`/volunteer-opportunity-teams/${id}/`).then((r) => r.data);

// ─── Time Slots ──────────────────────────────────────────────────────────────

export const getOpportunityTimeSlots = ({ opportunity_id, page, limit }: { opportunity_id: string; page?: number; limit?: number }) =>
  apiClient.get(`/time-slots/?opportunity_id=${opportunity_id}&page=${page}&limit=${limit}`).then((r) => r.data);

export const getTimeSlots = (opportunity_id: string | number) =>
  apiClient.get(`/time-slots/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const getConsultationTimeSlots = (opportunity_id: string | number) =>
  apiClient.get(`/time-slots/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const createTimeSlot = (data: any) =>
  apiClient.post("/time-slots/", data).then((r) => r.data);

export const updateTimeSlot = ({ id, opportunity_id, data }: { id: string; opportunity_id: string; data: any }) =>
  apiClient.patch(`/time-slots/${id}/?opportunity_id=${opportunity_id}`, data).then((r) => r.data);

export const deleteTimeSlot = ({ id, opportunity_id }: { id: string; opportunity_id: string }) =>
  apiClient.delete(`/time-slots/${id}/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const deleteAllTimeSlots = (opportunity_id: number) =>
  apiClient.delete(`/delete-time-slots/${opportunity_id}/`).then((r) => r.data);
