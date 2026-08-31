import apiClient from "@/lib/api/client";

// ─── Account ─────────────────────────────────────────────────────────────────

export const getAccountInfo = () =>
  apiClient.get("/account/").then((r) => r.data);

// POST, not PATCH — PHP only populates $_FILES for POST bodies, so a PATCH
// carrying a multipart profile picture upload silently drops the file server-side.
export const updateAccountInfo = (formData: FormData) =>
  apiClient.post("/account/", formData).then((r) => r.data);

// ─── Volunteer / Organizer profiles ──────────────────────────────────────────

export const getVolunteerProfile = () =>
  apiClient.get("/volunteer-profile/").then((r) => r.data);

export const updateVolunteerProfile = (data: any) =>
  apiClient.patch("/volunteer-profile/", data).then((r) => r.data);

export const getOrganizerProfile = () =>
  apiClient.get("/organization-profile/").then((r) => r.data);

export const updateOrganizerProfile = (data: any) =>
  apiClient.patch("/organization-profile/", data).then((r) => r.data);

export const updateOrganizerDocuments = (formData: FormData) =>
  apiClient.post("/organization-profile/documents/", formData).then((r) => r.data);

export const getQRCode = () =>
  apiClient.get("/volunteer-profile/qr-code/").then((r) => r.data);

export const getOrganizerQRCode = () =>
  apiClient.get("/volunteer-profile/qr-code/").then((r) => r.data);

// ─── Public profiles directory ───────────────────────────────────────────────

export const getPublicProfile = (id: string) =>
  apiClient.get(`/public-profile/${id}/`).then((r) => r.data);

// Combined 3-bucket preview (`data.volunteer` / `data.organization` /
// `data.volunteer_team`, each capped at `limit`) — for the profiles
// directory overview only. For a single bucket's full paginated list use
// the dedicated `getVolunteerProfilesList` / `getOrganizationProfilesList` /
// `getVolunteerTeamProfilesList` below instead.
export const getAllProfiles = (params?: any) =>
  apiClient.get("/all-profiles/", { params }).then((r) => r.data);

/** Full paginated volunteer list — flat `data` array + top-level `meta.pagination`. */
export const getVolunteerProfilesList = (params?: any) =>
  apiClient.get("/profiles/volunteers/", { params }).then((r) => r.data);

/** Full paginated organization list — excludes volunteer-team-type organizers. */
export const getOrganizationProfilesList = (params?: any) =>
  apiClient.get("/profiles/organizations/", { params }).then((r) => r.data);

/** Full paginated volunteer-team list. */
export const getVolunteerTeamProfilesList = (params?: any) =>
  apiClient.get("/profiles/volunteer-teams/", { params }).then((r) => r.data);

// ─── Certificates ────────────────────────────────────────────────────────────

export const getUserCertificates = (userId: string | number) =>
  apiClient
    .get("/user-certificates/", { params: { user_id: userId } })
    .then((r) => r.data);

/** Download the generated certificate attached to a volunteer registration. */
export const downloadUserCertificate = ({
  registration_id,
  fallbackName = "certificate",
}: {
  registration_id: string | number;
  fallbackName?: string;
}) =>
  apiClient
    .get("/download-certificate/", {
      params: { registration_id },
      responseType: "blob",
    })
    .then((response) => {
      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      const match = disposition?.match(/filename="(.+)"/);
      return {
        blob: response.data as Blob,
        filename: match?.[1] || `${fallbackName}_${Date.now()}.jpg`,
      };
    });
