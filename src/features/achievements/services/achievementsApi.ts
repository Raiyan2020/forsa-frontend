import apiClient from "@/lib/api/client";
import type { ApiPagination, ApiResponse } from "@/lib/api/types";

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

export interface VolunteerDetailOpportunity {
  title_en: string;
  title_ar: string;
  year: number;
}

/**
 * The paginated courses/opportunities block is itself a full envelope nested
 * inside `data` — it carries its own `meta.pagination`, separate from the
 * outer response's `meta`.
 */
export interface VolunteerDetailOpportunities {
  data: VolunteerDetailOpportunity[];
  meta: { pagination: ApiPagination; timestamp?: string };
}

export interface VolunteerDetailData {
  full_name: string;
  qr_code_url: string;
  opportunities: VolunteerDetailOpportunities;
  total_volunteer_hours: number | string | null;
  total_opportunities: number | string | null;
  total_certificates: number | string | null;
  opportunities_organized?: number | string | null;
  /**
   * Present on newer revisions; the same nested shape `/volunteer-profile/`
   * returns, and takes precedence over the flat counters above.
   */
  statistics?: {
    all_time?: {
      total_hours?: number | string;
      total_opportunities?: number | string;
      total_certificates?: number | string;
    };
  };
}

/**
 * `download=true` streams the report PDF back as bytes — `Content-Type:
 * application/pdf`, no envelope and no `pdf_url` to fetch separately (BE-19,
 * resolved 2026-09-08). The document's language comes from the `x-lang` /
 * `Accept-Language` headers the request interceptor already sends, so there is
 * no language param to pass.
 */
export interface VolunteerDetailPdf {
  blob: Blob;
  filename: string;
}

/**
 * The achievement report. Like every endpoint this answers with the standard
 * envelope — the report fields live under `data`, not at the root.
 */
export const getVolunteerDetail = (params?: { page?: number; limit?: number }) =>
  apiClient
    .get<ApiResponse<VolunteerDetailData>>("/volunteer-detail/", { params })
    .then((r) => r.data);

export const downloadVolunteerDetail = (): Promise<VolunteerDetailPdf> =>
  apiClient
    .get("/volunteer-detail/", {
      params: { download: true },
      responseType: "blob",
    })
    .then(async (response) => {
      const blob = response.data as Blob;

      // A 200 carrying JSON rather than a PDF is how this endpoint reported
      // "not implemented" before BE-19 was built, and how a Laravel error page
      // would come back too. With `responseType: "blob"` axios doesn't parse it,
      // so it would otherwise be saved as a .pdf full of JSON.
      if (!blob.type.includes("pdf")) {
        const text = await blob.text();
        let message = "";
        try {
          const payload = JSON.parse(text);
          message = payload?.msg || payload?.data?.message || "";
        } catch {
          // Not JSON either — fall through to the caller's generic message.
        }
        throw new Error(message || "Report PDF was not returned");
      }

      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);

      return {
        blob,
        filename:
          match?.[1] ||
          `achievement-report-${new Date().toISOString().split("T")[0]}.pdf`,
      };
    });
