import apiClient from "@/lib/api/client";

export const getAllOrganizations = (params?: any) =>
  apiClient.get("/list-organizations/", { params }).then((r) => r.data);

export const getAvailableVolunteers = (params?: any) =>
  apiClient.get("/available-volunteers/", { params }).then((r) => r.data);
