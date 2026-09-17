import apiClient from "@/lib/api/client";
import type { RegistrationsDownload } from "@/lib/api/types";

export const getLearnServeOpportunitiesList = (params?: any) =>
  apiClient.get("/learn-serve-opportunities/", { params }).then((r) => r.data);

export const getLearnServeOpportunityById = (id: string) =>
  apiClient.get(`/learn-serve-opportunities/${id}/`).then((r) => r.data);

export const createLearnServeOpportunity = (data: any) =>
  apiClient.post("/learn-serve-opportunities/", data).then((r) => r.data);

// See `updateVolunteerOpportunity` — same PATCH+multipart workaround.
export const updateLearnServeOpportunity = ({ id, data }: { id: string; data: any }) => {
  if (data instanceof FormData) data.append("_method", "PATCH");
  return apiClient.post(`/learn-serve-opportunities/${id}/`, data).then((r) => r.data);
};

export const updateLearnServeOpportunityImages = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/learn-serve-opportunities/${id}/update_images/`, formData).then((r) => r.data);

export interface LearnServeRegistrationPayload {
  opportunity_id: string | number;
  time_slot_id?: number;
}

export const registerForLearnServeOpportunity = (data: LearnServeRegistrationPayload) =>
  apiClient.post("/learn-serve-opportunity-registrations/", data).then((r) => r.data);

export const unregisterFromLearnServeOpportunity = (id: string) =>
  apiClient.post(`/learn-serve-opportunities/${id}/unregister/`).then((r) => r.data);

/** Creator-only: stop accepting registrations before the due date is reached. */
export const closeLearnServeOpportunityRegistration = (id: string) =>
  apiClient.post(`/learn-serve-opportunities/${id}/close-registration/`).then((r) => r.data);

/**
 * Creator-only: undo an earlier close-registration.
 *
 * Volunteering has a dedicated `POST .../reopen-registration/` route; learn &
 * serve has only the close half (BE-63 asks for the symmetric one). Until it
 * lands, the flag is cleared through the ordinary update endpoint, which
 * already validates `is_registration_closed` as a boolean and is a partial
 * update — a payload carrying nothing else leaves every other column alone.
 * The notification behaviour is identical either way: both paths run
 * OpportunityChangeNotifier over a snapshot that includes this column.
 */
export const reopenLearnServeOpportunityRegistration = (id: string) => {
  const data = new FormData();
  data.append("is_registration_closed", "0");
  return updateLearnServeOpportunity({ id, data });
};

export const deleteLearnServeRegistrationByOpportunity = ({ opportunity_id, user_id }: { opportunity_id: string | number; user_id: string | number }) =>
  apiClient.delete(`/learnserve/${opportunity_id}/unregister/${user_id}/`).then((r) => r.data);

export const getLearnServeRegistrations = ({ opportunity_id, ...params }: { opportunity_id: string;[key: string]: any }) =>
  apiClient.get(`/learn-serve-opportunities/${opportunity_id}/registrations/`, { params }).then((r) => r.data);

export const downloadLearnServeRegistrations = ({
  opportunity_id,
  search,
  attended,
  all_data,
}: {
  opportunity_id: string;
  search?: string;
  attended?: boolean;
  all_data?: boolean;
}): Promise<RegistrationsDownload> => {
  const params = new URLSearchParams();
  params.append("download", "true");
  if (search) params.append("search", search);
  if (attended !== undefined) params.append("attended", String(attended));
  if (all_data) params.append("all_data", "true");

  return apiClient
    .get(`/learn-serve-opportunities/${opportunity_id}/registrations/`, {
      params,
    })
    .then((r) => r.data.data);
};

export const updateLearnServeAttendance = ({ opportunity_id, data }: { opportunity_id: string; data: any }) =>
  apiClient.patch(`/learn-serve-opportunities/${opportunity_id}/update-attendance/`, data).then((r) => r.data);
