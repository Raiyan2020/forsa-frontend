import apiClient from "@/lib/api/client";

export const getCalendar = (params?: any) =>
  apiClient.get("/my-calendar/", { params }).then((r) => r.data);

/**
 * iPadOS refuses to open a locally-generated blob in Calendar, so the .ics is
 * uploaded and the returned URL is opened instead.
 */
export const uploadICSFile = (formData: FormData) =>
  apiClient.post("/upload-ics/", formData).then((r) => r.data);

export const saveToCalendar = (data: any) =>
  apiClient.post("/my-calendar/save/", data).then((r) => r.data);
