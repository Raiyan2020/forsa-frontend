import apiClient from "@/lib/api/client";

// ─── Events ──────────────────────────────────────────────────────────────────

export const getAllEvents = (params?: any) =>
  apiClient.get("/events/", { params }).then((r) => r.data);

export const getEventById = ({ id, passToken }: { id: string; passToken?: boolean }) =>
  apiClient.get(`/events/${id}/`, { params: passToken ? { pass_token: true } : {} }).then((r) => r.data);

export const createEvent = (data: any) =>
  apiClient.post("/events/", data).then((r) => r.data);

export const republishEvent = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.post(`/event/republish/${id}`, formData).then((r) => r.data);

// See `updateVolunteerOpportunity` — same PATCH+multipart workaround.
export const updateEvent = ({ id, formData }: { id: string; formData: FormData }) => {
  formData.append("_method", "PATCH");
  return apiClient.post(`/events/${id}/`, formData).then((r) => r.data);
};

export const requestEventDeletion = (eventId: string) =>
  apiClient.post(`/events/${eventId}/request-deletion/`).then((r) => r.data);

/*
 * Events are an announcement surface only: the organizer runs sign-ups on their
 * own channel through the event's `registration_link`, so Fursa never holds a
 * participation or attendance record for one.
 *
 * The backend still exposes `/event-registrations/` (list, create, update with
 * `is_attended`, XLSX export), `/events/{id}/unregister/` and
 * `/event-time-slots/`, and those wrappers used to live here. They are gone on
 * purpose — do not add them back. See BE-41 in `FURSA_BACKEND_ISSUES.md` for the
 * matching backend removal.
 */

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
