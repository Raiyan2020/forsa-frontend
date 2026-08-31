import apiClient from "@/lib/api/client";

export const getRolesOfOpportunity = (params?: any) =>
  apiClient.get("/volunteer-opportunity-roles/", { params }).then((r) => r.data);

export const createVolunteerOpportunityRole = (data: any) =>
  apiClient.post("/volunteer-opportunity-roles/", data).then((r) => r.data);

export const getVolunteerOpportunityRoleById = (id: string) =>
  apiClient.get(`/volunteer-opportunity-roles/${id}/`).then((r) => r.data);

export const updateVolunteerOpportunityRole = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/volunteer-opportunity-roles/${id}/`, data).then((r) => r.data);

export const deleteVolunteerOpportunityRole = (id: string) =>
  apiClient.delete(`/volunteer-opportunity-roles/${id}/`).then((r) => r.data);

export const deleteAllRoles = (opportunityId: number) =>
  apiClient.delete(`/delete-roles/${opportunityId}/`).then((r) => r.data);
