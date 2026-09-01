import apiClient from "@/lib/api/client";

export const getNotifications = () =>
  apiClient.get("/notifications/").then((r) => r.data);

export const getUnreadNotificationsCount = () =>
  apiClient.get("/notifications/").then((r) => r.data);

export const markNotificationsRead = (data: any) =>
  apiClient.post("/notifications/mark-read/", data).then((r) => r.data);

/** Deletes a single notification via the RESTful `DELETE /notifications/{id}/`. */
export const deleteNotifications = (id: string | number) =>
  apiClient.delete(`/notifications/${id}/`).then((r) => r.data);
