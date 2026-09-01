import apiClient from "@/lib/api/client";
import type { RegistrationsDownload } from "@/lib/api/types";

// ─── Events ──────────────────────────────────────────────────────────────────

export const getAllEvents = (params?: any) =>
  apiClient.get("/events/", { params }).then((r) => r.data);

export const getEventById = ({ id, passToken }: { id: string; passToken?: boolean }) =>
  apiClient.get(`/events/${id}/`, { params: passToken ? { pass_token: true } : {} }).then((r) => r.data);

export const createEvent = (data: any) =>
  apiClient.post("/events/", data).then((r) => r.data);

// See `updateVolunteerOpportunity` — same PATCH+multipart workaround.
export const updateEvent = ({ id, formData }: { id: string; formData: FormData }) => {
  formData.append("_method", "PATCH");
  return apiClient.post(`/events/${id}/`, formData).then((r) => r.data);
};

export const registerForEvent = (data: any) =>
  apiClient.post("/event-registrations/", data).then((r) => r.data);

export const unregisterFromEvent = (id: string) =>
  apiClient.post(`/events/${id}/unregister/`).then((r) => r.data);

export const getEventTimeSlots = (eventId: string | number) =>
  apiClient
    .get("/event-time-slots/", { params: { event_id: eventId } })
    .then((r) => r.data);

export const requestEventDeletion = (eventId: string) =>
  apiClient.post(`/events/${eventId}/request-deletion/`).then((r) => r.data);


export const getEventRegistrations = (params?: any) =>
  apiClient.get("/event-registrations/", { params }).then((r) => r.data);

export const downloadEventRegistrations = ({
  event_id,
  search,
  mark_attendance,
}: {
  event_id: string;
  search?: string;
  mark_attendance?: boolean;
}): Promise<RegistrationsDownload> => {
  const params = new URLSearchParams();
  params.append("event_id", event_id);
  params.append("download", "true");
  if (search) params.append("search", search);
  if (mark_attendance) params.append("mark_attendance", "true");

  return apiClient
    .get("/event-registrations/", { params })
    .then((r) => r.data);
};

// ─── Event Feedbacks ─────────────────────────────────────────────────────────

export const getEventFeedbacks = (eventId?: string | number) =>
  apiClient
    .get("/event-feedback/", {
      params: eventId ? { event_id: eventId } : undefined,
    })
    .then((r) => r.data);

export const createEventFeedback = (data: any) =>
  apiClient.post("/event-feedback/", data).then((r) => r.data);

export const updateEventFeedback = ({ feedback_id, data }: { feedback_id: string; data: any }) =>
  apiClient.patch(`/event-feedback/${feedback_id}/`, data).then((r) => r.data);

export const deleteEventFeedback = (feedback_id: string) =>
  apiClient.delete(`/event-feedback/${feedback_id}/`).then((r) => r.data);

export const likeEventFeedback = (data: any) =>
  apiClient.post("/event-feedback-like/", data).then((r) => r.data);
