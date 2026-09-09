import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";

// ─── Opportunities ───────────────────────────────────────────────────────────

export const getOpportunitiesList = (params?: any) =>
  apiClient.get("/list-volunteer-opportunities/", { params }).then((r) => r.data);

export const getAllOpportunities = (params?: any) =>
  apiClient.get("/list-all-opportunities/", { params }).then((r) => r.data);

export const getUserOpportunities = (params?: any) =>
  apiClient.get("/list-user-opportunities/", { params }).then((r) => r.data);

export const getOpportunityById = (id: string, passToken?: boolean) =>
  apiClient.get(`/opportunities/${id}/details/`, { params: passToken ? { pass_token: true } : {} }).then((r) => r.data);

export const createVolunteerOpportunity = (data: any) =>
  apiClient.post("/volunteer-opportunities/", data).then((r) => r.data);

// Plain POST — the backend removed the PATCH/PUT routes entirely for this
// endpoint (PHP never populated $_FILES on a literal PATCH body, so a
// multipart image update silently dropped the file server-side; same fix as
// `updateAccountInfo`). A PATCH/PUT request here now gets a 405.
export const updateVolunteerOpportunity = ({ id, data }: { id: string; data: any }) =>
  apiClient.post(`/volunteer-opportunities/${id}/`, data).then((r) => r.data);

// Same PATCH/PUT removal as `updateVolunteerOpportunity` above.
export const updateVolunteerOpportunityImages = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.post(`/volunteer-opportunities/${id}/update_images/`, formData).then((r) => r.data);

type OpportunitySponsorType = "volunteer" | "learn-serve";

interface OpportunitySponsorRelation {
  id: string | number;
  organization?: { id?: string | number } | string | number | null;
}

const sponsorEndpoint = (type: OpportunitySponsorType, opportunityId: string) =>
  type === "volunteer"
    ? `/volunteer-opportunities/${opportunityId}/sponsors/`
    : `/learn-serve-opportunities/${opportunityId}/sponsors/`;

/**
 * Synchronize the sponsor picker through the dedicated relationship endpoints.
 * Sponsor row ids and organization ids are different, so removals must use the
 * relation id returned in `opportunity_sponsor_images[].id`.
 */
export const syncOpportunitySponsors = async ({
  type,
  opportunityId,
  organizationIds,
  currentSponsors = [],
}: {
  type: OpportunitySponsorType;
  opportunityId: string;
  organizationIds: string[];
  currentSponsors?: OpportunitySponsorRelation[];
}) => {
  const desiredIds = new Set(organizationIds.filter(Boolean).map(String));
  const currentByOrganization = new Map(
    currentSponsors.flatMap((sponsor) => {
      const organizationId =
        typeof sponsor.organization === "object" && sponsor.organization !== null
          ? sponsor.organization.id
          : sponsor.organization;
      return organizationId == null
        ? []
        : [[String(organizationId), String(sponsor.id)] as const];
    })
  );
  const endpoint = sponsorEndpoint(type, opportunityId);

  await Promise.all([
    ...Array.from(currentByOrganization.entries())
      .filter(([organizationId]) => !desiredIds.has(organizationId))
      .map(([, sponsorRelationId]) =>
        apiClient.delete(`${endpoint}${sponsorRelationId}/`)
      ),
    ...Array.from(desiredIds)
      .filter((organizationId) => !currentByOrganization.has(organizationId))
      .map((organizationId) =>
        apiClient.post(endpoint, { organization_id: Number(organizationId) })
      ),
  ]);
};

/**
 * Organizer-only: issue and email certificates for a completed volunteer
 * opportunity's attended registrations.
 *
 * Completion already issues certificates automatically, so this covers
 * attendance marked *after* that pass ran. It is idempotent — a second call
 * answers `certificates_sent: 0` when nothing new is eligible (BE-14). Learn &
 * serve has its own separate certificate pipeline; this route is only for
 * `volunteer_opportunity`.
 */
export const sendVolunteerOpportunityCertificates = (id: string) =>
  apiClient
    .post<ApiResponse<{ certificates_sent?: number }>>(
      `/volunteer-opportunities/${id}/certificates/send/`
    )
    .then((r) => r.data);

export const deleteOpportunityImage = (data: any) =>
  apiClient.delete("/delete-opportunity-image/", { data }).then((r) => r.data);

/**
 * Streams an uploaded opportunity/event image back as a file. Unlike the
 * registration "download" endpoints (which return a JSON `downloadUrl`), this
 * one returns the bytes, so the caller saves the blob itself.
 */
export const downloadOpportunityImage = ({
  image_id,
  fallbackName = "opportunity_image",
}: {
  image_id: number;
  fallbackName?: string;
}) =>
  apiClient
    .get("/download-url/", {
      params: { image_id },
      responseType: "blob",
    })
    .then((response) => {
      // Prefer the server-supplied filename when Content-Disposition carries one
      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      const match = disposition?.match(/filename="(.+)"/);
      return {
        blob: response.data as Blob,
        filename: match?.[1] || `${fallbackName}_${Date.now()}.jpg`,
      };
    });

export const requestOpportunityDeletion = ({ id, type }: { id: string; type: "volunteer" | "learnserve" }) =>
  apiClient.post(`/opportunities/${id}/request-deletion/`, { type: type.toLowerCase() }).then((r) => r.data);

// ─── Creator eligibility ─────────────────────────────────────────────────────

export const checkLicenseRequirement = () =>
  apiClient.get("/check-license-requirement/").then((r) => r.data);
