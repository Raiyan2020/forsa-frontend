import apiClient from "@/lib/api/client";

// ─── Achievements statistics ─────────────────────────────────────────────────

export const getAchievementsChartData = () =>
  apiClient.get("/statistics/").then((r) => r.data);

export const getAchievementsTeamsData = () =>
  apiClient.get("/statistics/top").then((r) => r.data);

export const getAchievementReports = (params?: any) =>
  apiClient.get("/achievement-reports/", { params }).then((r) => r.data);

// ─── Report / certificate verification ───────────────────────────────────────

export const verifyReport = (uuid: string) =>
  apiClient.get(`/verify-report/${uuid}/`).then((r) => r.data);

export const verifyVolunteerReport = ({ uuid }: { uuid: string }) =>
  apiClient.get(`/verify/${uuid}/`).then((r) => r.data);

// ─── Volunteer report download ───────────────────────────────────────────────

export const getCertificate = (params?: any) =>
  apiClient.get("/certificate/", { params }).then((r) => r.data);

export const getVolunteerDetail = (params?: { page?: number; limit?: number; download?: boolean }) =>
  apiClient.get("/volunteer-detail/", { params }).then((r) => r.data);
