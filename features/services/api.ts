/**
 * Centralized API service for the Next.js project.
 * Mirrors the RTK Query endpoints from the React frontend's authService.ts
 * using plain async functions consumable by React Query (useQuery / useMutation).
 */

import apiClient from "@/lib/api/client";

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginRequest = (credentials: any) =>
  apiClient.post("/api/login/", credentials).then((r) => r.data);

export const registerRequest = (credentials: any) =>
  apiClient.post("/api/register/", credentials).then((r) => r.data);

export const forgotPasswordRequest = (credentials: any) =>
  apiClient.post("/api/forgot-password/", credentials).then((r) => r.data);

export const emailVerificationRequest = (credentials: any) =>
  apiClient.post("/api/verify_otp_or_token/", credentials).then((r) => r.data);

export const resendOtpRequest = (credentials: any) =>
  apiClient.post("/api/resend_otp_or_token/", credentials).then((r) => r.data);

export const changePasswordRequest = (credentials: any) =>
  apiClient.post("/api/change-password/", credentials).then((r) => r.data);

export const passSocialInfoRequest = (credentials: any) =>
  apiClient.post("/api/social-auth/", credentials).then((r) => r.data);

export const checkUserRequest = (credentials: any) =>
  apiClient.post("/api/check-user/", credentials).then((r) => r.data);

export const linkedinLoginRequest = () =>
  apiClient.get("/api/linkedin/login/").then((r) => r.data);

// ─── Dropdown Choices ────────────────────────────────────────────────────────

export const getDropdownChoices = (type: string) =>
  apiClient.get(`/api/choices/${type}/`).then((r) => r.data);

// ─── Account & Profile ───────────────────────────────────────────────────────

export const getAccountInfo = () =>
  apiClient.get("/api/account/").then((r) => r.data);

export const updateAccountInfo = (formData: FormData) =>
  apiClient.patch("/api/account/", formData).then((r) => r.data);

export const getVolunteerProfile = () =>
  apiClient.get("/api/volunteer-profile/").then((r) => r.data);

export const updateVolunteerProfile = (data: any) =>
  apiClient.patch("/api/volunteer-profile/", data).then((r) => r.data);

export const getOrganizerProfile = () =>
  apiClient.get("/api/organization-profile/").then((r) => r.data);

export const updateOrganizerProfile = (data: any) =>
  apiClient.patch("/api/organization-profile/", data).then((r) => r.data);

export const updateOrganizerDocuments = (formData: FormData) =>
  apiClient.post("/api/organization-profile/documents/", formData).then((r) => r.data);

export const getQRCode = () =>
  apiClient.get("/api/volunteer-profile/qr-code/").then((r) => r.data);

export const getPublicProfile = (id: string) =>
  apiClient.get(`/api/public-profile/${id}/`).then((r) => r.data);

export const getUserCertificates = (userId: string | number) =>
  apiClient
    .get("/api/user-certificates/", { params: { user_id: userId } })
    .then((r) => r.data);

export const getAllProfiles = (params?: any) =>
  apiClient.get("/api/all-profiles/", { params }).then((r) => r.data);

export const getAllOrganizations = (params?: any) =>
  apiClient.get("/api/list-organizations/", { params }).then((r) => r.data);

export const getAvailableVolunteers = (params?: any) =>
  apiClient.get("/api/available-volunteers/", { params }).then((r) => r.data);

export const getOrganizerQRCode = () =>
  apiClient.get("/api/volunteer-profile/qr-code/").then((r) => r.data);

// ─── Notifications ───────────────────────────────────────────────────────────

export const getNotifications = () =>
  apiClient.get("/api/notifications/").then((r) => r.data);

export const getUnreadNotificationsCount = () =>
  apiClient.get("/api/notifications/").then((r) => r.data);

export const markNotificationsRead = (data: any) =>
  apiClient.post("/api/notifications/mark-read/", data).then((r) => r.data);

export const deleteNotifications = (data: { notification_ids: number[] }) =>
  apiClient.post("/api/notifications/delete/", data).then((r) => r.data);

export const checkLicenseRequirement = () =>
  apiClient.get("/api/check-license-requirement/").then((r) => r.data);

// ─── Partners / Sponsors ─────────────────────────────────────────────────────

export const getSponsors = () =>
  apiClient.get("/api/sponsors/").then((r) => r.data);

export const createSponsors = (formData: FormData) =>
  apiClient.post("/api/sponsors/", formData).then((r) => r.data);

// ─── Opportunities ───────────────────────────────────────────────────────────

export const getOpportunitiesList = (params?: any) =>
  apiClient.get("/api/list-volunteer-opportunities/", { params }).then((r) => r.data);

export const getAllOpportunities = (params?: any) =>
  apiClient.get("/api/list-all-opportunities/", { params }).then((r) => r.data);

export const getUserOpportunities = (params?: any) =>
  apiClient.get("/api/list-user-opportunities/", { params }).then((r) => r.data);

export const getOpportunityById = (id: string, passToken?: boolean) =>
  apiClient.get(`/api/opportunities/${id}/details/`, { params: passToken ? { pass_token: true } : {} }).then((r) => r.data);

export const createVolunteerOpportunity = (data: any) =>
  apiClient.post("/api/volunteer-opportunities/", data).then((r) => r.data);

export const updateVolunteerOpportunity = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/api/volunteer-opportunities/${id}/`, data).then((r) => r.data);

export const updateVolunteerOpportunityImages = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/api/volunteer-opportunities/${id}/update_images/`, formData).then((r) => r.data);

export const registerForVolunteerOpportunity = (data: any) =>
  apiClient.post("/api/volunteer-opportunity-registrations/", data).then((r) => r.data);

export const unregisterFromVolunteerOpportunity = (id: string) =>
  apiClient.post(`/api/volunteer-opportunities/${id}/unregister/`).then((r) => r.data);

export const deleteOpportunityImage = (data: any) =>
  apiClient.delete("/api/delete-opportunity-image/", { data }).then((r) => r.data);

export const requestOpportunityDeletion = ({ id, type }: { id: string; type: "volunteer" | "learnserve" }) =>
  apiClient.post(`/api/opportunities/${id}/request-deletion/`, { type: type.toLowerCase() }).then((r) => r.data);

// ─── Opportunity Roles ───────────────────────────────────────────────────────

export const getRolesOfOpportunity = (params?: any) =>
  apiClient.get("/api/volunteer-opportunity-roles/", { params }).then((r) => r.data);

export const createVolunteerOpportunityRole = (data: any) =>
  apiClient.post("/api/volunteer-opportunity-roles/", data).then((r) => r.data);

export const getVolunteerOpportunityRoleById = (id: string) =>
  apiClient.get(`/api/volunteer-opportunity-roles/${id}/`).then((r) => r.data);

export const updateVolunteerOpportunityRole = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/api/volunteer-opportunity-roles/${id}/`, data).then((r) => r.data);

export const deleteVolunteerOpportunityRole = (id: string) =>
  apiClient.delete(`/api/volunteer-opportunity-roles/${id}/`).then((r) => r.data);

export const deleteAllRoles = (opportunityId: number) =>
  apiClient.delete(`/api/delete-roles/${opportunityId}/`).then((r) => r.data);

// ─── Volunteer Registrations ─────────────────────────────────────────────────

export const updateVolunteerRegistration = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/api/volunteer-opportunity-registrations/`, data).then((r) => r.data);

export const getVolunteerRegistrations = (params?: any) =>
  apiClient.get("/api/volunteer-opportunity-registrations/", { params }).then((r) => r.data);

export const downloadVolunteerRegistrations = (params?: any) =>
  apiClient.get("/api/volunteer-opportunity-registrations/", { params, responseType: "blob" }).then((r) => r.data);

export const directRegisterVolunteer = (data: any) =>
  apiClient.post("/api/volunteer-opportunity-registrations/direct-register/", data).then((r) => r.data);

export const directUnregisterVolunteer = (data: any) =>
  apiClient.post("/api/volunteer-opportunity-registrations/direct-unregister/", data).then((r) => r.data);

// ─── Teams ───────────────────────────────────────────────────────────────────

export const getTeams = (params?: any) =>
  apiClient.get("/api/volunteer-opportunity-teams/", { params }).then((r) => r.data);

export const createTeam = (data: any) =>
  apiClient.post("/api/volunteer-opportunity-teams/", data).then((r) => r.data);

export const updateTeam = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/api/volunteer-opportunity-teams/${id}/`, data).then((r) => r.data);

export const deleteTeam = (id: string) =>
  apiClient.delete(`/api/volunteer-opportunity-teams/${id}/`).then((r) => r.data);

export const getTeamById = (id: string) =>
  apiClient.get(`/api/volunteer-opportunity-teams/${id}/`).then((r) => r.data);

// ─── Learn & Serve Opportunities ─────────────────────────────────────────────

export const getLearnServeOpportunitiesList = (params?: any) =>
  apiClient.get("/api/learn-serve-opportunities/", { params }).then((r) => r.data);

export const getLearnServeOpportunityById = (id: string) =>
  apiClient.get(`/api/learn-serve-opportunities/${id}/`).then((r) => r.data);

export const createLearnServeOpportunity = (data: any) =>
  apiClient.post("/api/learn-serve-opportunities/", data).then((r) => r.data);

export const updateLearnServeOpportunity = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/api/learn-serve-opportunities/${id}/`, data).then((r) => r.data);

export const updateLearnServeOpportunityImages = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/api/learn-serve-opportunities/${id}/update_images/`, formData).then((r) => r.data);

export const registerForLearnServeOpportunity = (data: any) =>
  apiClient.post("/api/learn-serve-opportunity-registrations/", data).then((r) => r.data);

export const unregisterFromLearnServeOpportunity = (id: string) =>
  apiClient.post(`/api/learn-serve-opportunities/${id}/unregister/`).then((r) => r.data);

export const deleteLearnServeRegistrationByOpportunity = ({ opportunity_id, user_id }: { opportunity_id: string | number; user_id: string | number }) =>
  apiClient.delete(`/api/learnserve/${opportunity_id}/unregister/${user_id}/`).then((r) => r.data);

export const getLearnServeRegistrations = ({ opportunity_id, ...params }: { opportunity_id: string;[key: string]: any }) =>
  apiClient.get(`/api/learn-serve-opportunities/${opportunity_id}/registrations/`, { params }).then((r) => r.data);

export const downloadLearnServeRegistrations = ({ opportunity_id, ...params }: { opportunity_id: string;[key: string]: any }) =>
  apiClient.get(`/api/learn-serve-opportunities/${opportunity_id}/registrations/`, { params, responseType: "blob" }).then((r) => r.data);

export const updateLearnServeRegistration = ({ registration_id, data }: { registration_id: string; data: any }) =>
  apiClient.patch(`/api/learn-serve-opportunity-registrations/${registration_id}/`, data).then((r) => r.data);

export const deleteLearnServeRegistration = (registration_id: string) =>
  apiClient.delete(`/api/learn-serve-opportunity-registrations/${registration_id}/`).then((r) => r.data);

export const updateLearnServeAttendance = ({ opportunity_id, data }: { opportunity_id: string; data: any }) =>
  apiClient.patch(`/api/learn-serve-opportunities/${opportunity_id}/update-attendance/`, data).then((r) => r.data);

// ─── Time Slots ──────────────────────────────────────────────────────────────

export const getOpportunityTimeSlots = ({ opportunity_id, page, limit }: { opportunity_id: string; page?: number; limit?: number }) =>
  apiClient.get(`/api/time-slots/?opportunity_id=${opportunity_id}&page=${page}&limit=${limit}`).then((r) => r.data);

export const getTimeSlots = (opportunity_id: string | number) =>
  apiClient.get(`/api/time-slots/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const getConsultationTimeSlots = (opportunity_id: string | number) =>
  apiClient.get(`/api/time-slots/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const createTimeSlot = (data: any) =>
  apiClient.post("/api/time-slots/", data).then((r) => r.data);

export const updateTimeSlot = ({ id, opportunity_id, data }: { id: string; opportunity_id: string; data: any }) =>
  apiClient.patch(`/api/time-slots/${id}/?opportunity_id=${opportunity_id}`, data).then((r) => r.data);

export const deleteTimeSlot = ({ id, opportunity_id }: { id: string; opportunity_id: string }) =>
  apiClient.delete(`/api/time-slots/${id}/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const deleteAllTimeSlots = (opportunity_id: number) =>
  apiClient.delete(`/api/delete-time-slots/${opportunity_id}/`).then((r) => r.data);

// ─── Opportunity Feedbacks ───────────────────────────────────────────────────

export const createOpportunityFeedback = (data: any) =>
  apiClient.post("/api/opportunity-feedbacks/", data).then((r) => r.data);

export const getOpportunityFeedbacks = (opportunity_id: string) =>
  apiClient.get("/api/opportunity-feedbacks/", { params: { opportunity_id } }).then((r) => r.data);

export const likeOpportunityFeedback = (feedback_id: string) =>
  apiClient.post(`/api/opportunity-feedback/${feedback_id}/like/`).then((r) => r.data);

export const updateOpportunityFeedback = ({ feedback_id, data }: { feedback_id: string; data: any }) =>
  apiClient.patch(`/api/opportunity-feedbacks/${feedback_id}/`, data).then((r) => r.data);

export const deleteOpportunityFeedback = (feedback_id: string) =>
  apiClient.delete(`/api/opportunity-feedbacks/${feedback_id}/`).then((r) => r.data);

// ─── Events ──────────────────────────────────────────────────────────────────

export const getAllEvents = (params?: any) =>
  apiClient.get("/api/events/", { params }).then((r) => r.data);

export const getEventById = ({ id, passToken }: { id: string; passToken?: boolean }) =>
  apiClient.get(`/api/events/${id}/`, { params: passToken ? { pass_token: true } : {} }).then((r) => r.data);

export const createEvent = (data: any) =>
  apiClient.post("/api/events/", data).then((r) => r.data);

export const updateEvent = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/api/events/${id}/`, formData).then((r) => r.data);

export const registerForEvent = (data: any) =>
  apiClient.post("/api/event-registrations/", data).then((r) => r.data);

export const unregisterFromEvent = (id: string) =>
  apiClient.post(`/api/events/${id}/unregister/`).then((r) => r.data);

export const getEventTimeSlots = (eventId: string | number) =>
  apiClient
    .get("/api/event-time-slots/", { params: { event_id: eventId } })
    .then((r) => r.data);

export const requestEventDeletion = (eventId: string) =>
  apiClient.post(`/api/events/${eventId}/request-deletion/`).then((r) => r.data);


export const getEventRegistrations = (params?: any) =>
  apiClient.get("/api/event-registrations/", { params }).then((r) => r.data);

export const downloadEventRegistrations = (params?: any) =>
  apiClient.get("/api/event-registrations/", { params, responseType: "blob" }).then((r) => r.data);

// ─── Event Feedbacks ─────────────────────────────────────────────────────────

export const getEventFeedbacks = (eventId?: string | number) =>
  apiClient
    .get("/api/event-feedback/", {
      params: eventId ? { event_id: eventId } : undefined,
    })
    .then((r) => r.data);

export const createEventFeedback = (data: any) =>
  apiClient.post("/api/event-feedback/", data).then((r) => r.data);

export const updateEventFeedback = ({ feedback_id, data }: { feedback_id: string; data: any }) =>
  apiClient.patch(`/api/event-feedback/${feedback_id}/`, data).then((r) => r.data);

export const deleteEventFeedback = (feedback_id: string) =>
  apiClient.delete(`/api/event-feedback/${feedback_id}/`).then((r) => r.data);

export const likeEventFeedback = (data: any) =>
  apiClient.post("/api/event-feedback-like/", data).then((r) => r.data);

// ─── FAQs ────────────────────────────────────────────────────────────────────

export const getFaqs = (params?: { page?: number; limit?: number }) =>
  apiClient.get("/api/faqs/", { params }).then((r) => r.data);

// ─── Contact Us ──────────────────────────────────────────────────────────────

export const createContactUs = (data: any) =>
  apiClient.post("/api/contact-us/", data).then((r) => r.data);

// ─── Calendar ────────────────────────────────────────────────────────────────

export const getCalendar = (params?: any) =>
  apiClient.get("/api/my-calendar/", { params }).then((r) => r.data);

export const saveToCalendar = (data: any) =>
  apiClient.post("/api/my-calendar/save/", data).then((r) => r.data);

// ─── Achievements ────────────────────────────────────────────────────────────

export const getAchievementsChartData = () =>
  apiClient.get("/api/statistics/").then((r) => r.data);

export const getAchievementsTeamsData = () =>
  apiClient.get("/api/statistics/top").then((r) => r.data);

export const getAchievementReports = (params?: any) =>
  apiClient.get("/api/achievement-reports/", { params }).then((r) => r.data);

// ─── Banner Images ───────────────────────────────────────────────────────────

export const getBannerImages = () =>
  apiClient.get("/api/banner-images/").then((r) => r.data);

// ─── Community ───────────────────────────────────────────────────────────────

export const getCommunityPosts = (params?: any) =>
  apiClient.get("/api/posts/", { params }).then((r) => r.data);

export const getCommunityPostById = (id: string) =>
  apiClient.get(`/api/posts/${id}/`).then((r) => r.data);

export const createCommunityPost = (data: any) =>
  apiClient.post("/api/posts/", data).then((r) => r.data);

export const updateCommunityPost = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/api/posts/${id}/`, data).then((r) => r.data);

export const deleteCommunityPost = (id: string) =>
  apiClient.delete(`/api/posts/${id}/`).then((r) => r.data);

export const getCommunityReplies = (postId: string) =>
  apiClient.get("/api/replies/", { params: { post_id: postId } }).then((r) => r.data);

export const createCommunityReply = (data: FormData) =>
  apiClient.post("/api/replies/", data).then((r) => r.data);

export const updateReply = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/api/replies/${id}/`, formData).then((r) => r.data);

export const getReplyById = (id: string) =>
  apiClient.get(`/api/replies/${id}/`).then((r) => r.data);

export const deleteReply = (id: string) =>
  apiClient.delete(`/api/replies/${id}/`).then((r) => r.data);

export const likeCommunityPost = (data: { post_id: string }) =>
  apiClient.post("/api/likes/toggle/", data).then((r) => r.data);

export const communityPostContactUs = (data: { post_id: string; message: string }) =>
  apiClient.post(`/api/posts/${data.post_id}/contact-creator/`, data).then((r) => r.data);


// ─── Scan QR ─────────────────────────────────────────────────────────────────

export const scanQRCode = (data: any) =>
  apiClient.post("/api/scan-qr/", data).then((r) => r.data);

// ─── Verify Report ───────────────────────────────────────────────────────────

export const verifyReport = (uuid: string) =>
  apiClient.get(`/api/verify-report/${uuid}/`).then((r) => r.data);

export const verifyVolunteerReport = ({ uuid }: { uuid: string }) =>
  apiClient.get(`/api/verify/${uuid}/`).then((r) => r.data);

// ─── Certificate ─────────────────────────────────────────────────────────────

export const getCertificate = (params?: any) =>
  apiClient.get("/api/certificate/", { params }).then((r) => r.data);

export const getVolunteerDetail = (params?: { page?: number; limit?: number; download?: boolean }) =>
  apiClient.get("/api/volunteer-detail/", { params }).then((r) => r.data);
