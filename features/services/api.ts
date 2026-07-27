/**
 * Centralized API service for the Next.js project.
 * Mirrors the RTK Query endpoints from the React frontend's authService.ts
 * using plain async functions consumable by React Query (useQuery / useMutation).
 */

import apiClient from "@/lib/api/client";
import type { ApiResponse, FaqItem } from "@/lib/api/types";

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginRequest = (credentials: any) =>
  apiClient.post("/login/", credentials).then((r) => r.data);

export const registerRequest = (credentials: any) =>
  apiClient.post("/register/", credentials).then((r) => r.data);

export const forgotPasswordRequest = (credentials: any) =>
  apiClient.post("/forgot-password/", credentials).then((r) => r.data);

export const emailVerificationRequest = (credentials: any) =>
  apiClient.post("/verify_otp_or_token/", credentials).then((r) => r.data);

export const resendOtpRequest = (credentials: any) =>
  apiClient.post("/resend_otp_or_token/", credentials).then((r) => r.data);

export const changePasswordRequest = (credentials: any) =>
  apiClient.post("/change-password/", credentials).then((r) => r.data);

export const passSocialInfoRequest = (credentials: any) =>
  apiClient.post("/social-auth/", credentials).then((r) => r.data);

export const checkUserRequest = (credentials: any) =>
  apiClient.post("/check-user/", credentials).then((r) => r.data);

export const linkedinLoginRequest = () =>
  apiClient.get("/linkedin/login/").then((r) => r.data);

// ─── Dropdown Choices ────────────────────────────────────────────────────────

export const getDropdownChoices = (type: string) =>
  apiClient.get(`/choices/${type}/`).then((r) => r.data);

// ─── Account & Profile ───────────────────────────────────────────────────────

export const getAccountInfo = () =>
  apiClient.get("/account/").then((r) => r.data);

export const updateAccountInfo = (formData: FormData) =>
  apiClient.patch("/account/", formData).then((r) => r.data);

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

export const getPublicProfile = (id: string) =>
  apiClient.get(`/public-profile/${id}/`).then((r) => r.data);

export const getUserCertificates = (userId: string | number) =>
  apiClient
    .get("/user-certificates/", { params: { user_id: userId } })
    .then((r) => r.data);

export const getAllProfiles = (params?: any) =>
  apiClient.get("/all-profiles/", { params }).then((r) => r.data);

export const getAllOrganizations = (params?: any) =>
  apiClient.get("/list-organizations/", { params }).then((r) => r.data);

export const getAvailableVolunteers = (params?: any) =>
  apiClient.get("/available-volunteers/", { params }).then((r) => r.data);

export const getOrganizerQRCode = () =>
  apiClient.get("/volunteer-profile/qr-code/").then((r) => r.data);

// ─── Notifications ───────────────────────────────────────────────────────────

export const getNotifications = () =>
  apiClient.get("/notifications/").then((r) => r.data);

export const getUnreadNotificationsCount = () =>
  apiClient.get("/notifications/").then((r) => r.data);

export const markNotificationsRead = (data: any) =>
  apiClient.post("/notifications/mark-read/", data).then((r) => r.data);

export const deleteNotifications = (data: { notification_ids: number[] }) =>
  apiClient.post("/notifications/delete/", data).then((r) => r.data);

export const checkLicenseRequirement = () =>
  apiClient.get("/check-license-requirement/").then((r) => r.data);

// ─── Partners / Sponsors ─────────────────────────────────────────────────────

export const getSponsors = () =>
  apiClient.get("/sponsors/").then((r) => r.data);

export const createSponsors = (formData: FormData) =>
  apiClient.post("/sponsors/", formData).then((r) => r.data);

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

export const updateVolunteerOpportunity = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/volunteer-opportunities/${id}/`, data).then((r) => r.data);

export const updateVolunteerOpportunityImages = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/volunteer-opportunities/${id}/update_images/`, formData).then((r) => r.data);

export const registerForVolunteerOpportunity = (data: any) =>
  apiClient.post("/volunteer-opportunity-registrations/", data).then((r) => r.data);

export const unregisterFromVolunteerOpportunity = (id: string) =>
  apiClient.post(`/volunteer-opportunities/${id}/unregister/`).then((r) => r.data);

export const deleteOpportunityImage = (data: any) =>
  apiClient.delete("/delete-opportunity-image/", { data }).then((r) => r.data);

export const requestOpportunityDeletion = ({ id, type }: { id: string; type: "volunteer" | "learnserve" }) =>
  apiClient.post(`/opportunities/${id}/request-deletion/`, { type: type.toLowerCase() }).then((r) => r.data);

// ─── Opportunity Roles ───────────────────────────────────────────────────────

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

// ─── Volunteer Registrations ─────────────────────────────────────────────────

export const updateVolunteerRegistration = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/volunteer-opportunity-registrations/`, data).then((r) => r.data);

export const getVolunteerRegistrations = (params?: any) =>
  apiClient.get("/volunteer-opportunity-registrations/", { params }).then((r) => r.data);

export const downloadVolunteerRegistrations = (params?: any) =>
  apiClient.get("/volunteer-opportunity-registrations/", { params, responseType: "blob" }).then((r) => r.data);

export const directRegisterVolunteer = (data: any) =>
  apiClient.post("/volunteer-opportunity-registrations/direct-register/", data).then((r) => r.data);

export const directUnregisterVolunteer = (data: any) =>
  apiClient.post("/volunteer-opportunity-registrations/direct-unregister/", data).then((r) => r.data);

// ─── Teams ───────────────────────────────────────────────────────────────────

export const getTeams = (params?: any) =>
  apiClient.get("/volunteer-opportunity-teams/", { params }).then((r) => r.data);

export const createTeam = (data: any) =>
  apiClient.post("/volunteer-opportunity-teams/", data).then((r) => r.data);

export const updateTeam = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/volunteer-opportunity-teams/${id}/`, data).then((r) => r.data);

export const deleteTeam = (id: string) =>
  apiClient.delete(`/volunteer-opportunity-teams/${id}/`).then((r) => r.data);

export const getTeamById = (id: string) =>
  apiClient.get(`/volunteer-opportunity-teams/${id}/`).then((r) => r.data);

// ─── Learn & Serve Opportunities ─────────────────────────────────────────────

export const getLearnServeOpportunitiesList = (params?: any) =>
  apiClient.get("/learn-serve-opportunities/", { params }).then((r) => r.data);

export const getLearnServeOpportunityById = (id: string) =>
  apiClient.get(`/learn-serve-opportunities/${id}/`).then((r) => r.data);

export const createLearnServeOpportunity = (data: any) =>
  apiClient.post("/learn-serve-opportunities/", data).then((r) => r.data);

export const updateLearnServeOpportunity = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/learn-serve-opportunities/${id}/`, data).then((r) => r.data);

export const updateLearnServeOpportunityImages = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/learn-serve-opportunities/${id}/update_images/`, formData).then((r) => r.data);

export const registerForLearnServeOpportunity = (data: any) =>
  apiClient.post("/learn-serve-opportunity-registrations/", data).then((r) => r.data);

export const unregisterFromLearnServeOpportunity = (id: string) =>
  apiClient.post(`/learn-serve-opportunities/${id}/unregister/`).then((r) => r.data);

export const deleteLearnServeRegistrationByOpportunity = ({ opportunity_id, user_id }: { opportunity_id: string | number; user_id: string | number }) =>
  apiClient.delete(`/learnserve/${opportunity_id}/unregister/${user_id}/`).then((r) => r.data);

export const getLearnServeRegistrations = ({ opportunity_id, ...params }: { opportunity_id: string;[key: string]: any }) =>
  apiClient.get(`/learn-serve-opportunities/${opportunity_id}/registrations/`, { params }).then((r) => r.data);

export const downloadLearnServeRegistrations = ({ opportunity_id, ...params }: { opportunity_id: string;[key: string]: any }) =>
  apiClient.get(`/learn-serve-opportunities/${opportunity_id}/registrations/`, { params, responseType: "blob" }).then((r) => r.data);

export const updateLearnServeRegistration = ({ registration_id, data }: { registration_id: string; data: any }) =>
  apiClient.patch(`/learn-serve-opportunity-registrations/${registration_id}/`, data).then((r) => r.data);

export const deleteLearnServeRegistration = (registration_id: string) =>
  apiClient.delete(`/learn-serve-opportunity-registrations/${registration_id}/`).then((r) => r.data);

export const updateLearnServeAttendance = ({ opportunity_id, data }: { opportunity_id: string; data: any }) =>
  apiClient.patch(`/learn-serve-opportunities/${opportunity_id}/update-attendance/`, data).then((r) => r.data);

// ─── Time Slots ──────────────────────────────────────────────────────────────

export const getOpportunityTimeSlots = ({ opportunity_id, page, limit }: { opportunity_id: string; page?: number; limit?: number }) =>
  apiClient.get(`/time-slots/?opportunity_id=${opportunity_id}&page=${page}&limit=${limit}`).then((r) => r.data);

export const getTimeSlots = (opportunity_id: string | number) =>
  apiClient.get(`/time-slots/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const getConsultationTimeSlots = (opportunity_id: string | number) =>
  apiClient.get(`/time-slots/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const createTimeSlot = (data: any) =>
  apiClient.post("/time-slots/", data).then((r) => r.data);

export const updateTimeSlot = ({ id, opportunity_id, data }: { id: string; opportunity_id: string; data: any }) =>
  apiClient.patch(`/time-slots/${id}/?opportunity_id=${opportunity_id}`, data).then((r) => r.data);

export const deleteTimeSlot = ({ id, opportunity_id }: { id: string; opportunity_id: string }) =>
  apiClient.delete(`/time-slots/${id}/?opportunity_id=${opportunity_id}`).then((r) => r.data);

export const deleteAllTimeSlots = (opportunity_id: number) =>
  apiClient.delete(`/delete-time-slots/${opportunity_id}/`).then((r) => r.data);

// ─── Opportunity Feedbacks ───────────────────────────────────────────────────

export const createOpportunityFeedback = (data: any) =>
  apiClient.post("/opportunity-feedbacks/", data).then((r) => r.data);

export const getOpportunityFeedbacks = (opportunity_id: string) =>
  apiClient.get("/opportunity-feedbacks/", { params: { opportunity_id } }).then((r) => r.data);

export const likeOpportunityFeedback = (feedback_id: string) =>
  apiClient.post(`/opportunity-feedback/${feedback_id}/like/`).then((r) => r.data);

export const updateOpportunityFeedback = ({ feedback_id, data }: { feedback_id: string; data: any }) =>
  apiClient.patch(`/opportunity-feedbacks/${feedback_id}/`, data).then((r) => r.data);

export const deleteOpportunityFeedback = (feedback_id: string) =>
  apiClient.delete(`/opportunity-feedbacks/${feedback_id}/`).then((r) => r.data);

// ─── Events ──────────────────────────────────────────────────────────────────

export const getAllEvents = (params?: any) =>
  apiClient.get("/events/", { params }).then((r) => r.data);

export const getEventById = ({ id, passToken }: { id: string; passToken?: boolean }) =>
  apiClient.get(`/events/${id}/`, { params: passToken ? { pass_token: true } : {} }).then((r) => r.data);

export const createEvent = (data: any) =>
  apiClient.post("/events/", data).then((r) => r.data);

export const updateEvent = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/events/${id}/`, formData).then((r) => r.data);

export const registerForEvent = (data: any) =>
  apiClient.post("/event-registrations/", data).then((r) => r.data);

export const unregisterFromEvent = (id: string) =>
  apiClient.post(`/events/${id}/unregister/`).then((r) => r.data);

export const getEventTimeSlots = (eventId: string | number) =>
  apiClient
    .get("/event-time-slots/", { params: { event_id: eventId } })
    .then((r) => r.data);

export const requestEventDeletion = (eventId: string) =>
  apiClient.post(`/events/${eventId}/request-deletion/`).then((r) => r.data);


export const getEventRegistrations = (params?: any) =>
  apiClient.get("/event-registrations/", { params }).then((r) => r.data);

export const downloadEventRegistrations = (params?: any) =>
  apiClient.get("/event-registrations/", { params, responseType: "blob" }).then((r) => r.data);

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

// ─── FAQs ────────────────────────────────────────────────────────────────────

export const getFaqs = (params?: { page?: number; limit?: number }) =>
  apiClient
    .get<ApiResponse<FaqItem[]>>("/faqs/", { params })
    .then((response) => response.data);

// ─── Contact Us ──────────────────────────────────────────────────────────────

export const createContactUs = (data: any) =>
  apiClient.post("/contact-us/", data).then((r) => r.data);

// ─── Calendar ────────────────────────────────────────────────────────────────

export const getCalendar = (params?: any) =>
  apiClient.get("/my-calendar/", { params }).then((r) => r.data);

export const saveToCalendar = (data: any) =>
  apiClient.post("/my-calendar/save/", data).then((r) => r.data);

// ─── Achievements ────────────────────────────────────────────────────────────

export const getAchievementsChartData = () =>
  apiClient.get("/statistics/").then((r) => r.data);

export const getAchievementsTeamsData = () =>
  apiClient.get("/statistics/top").then((r) => r.data);

export const getAchievementReports = (params?: any) =>
  apiClient.get("/achievement-reports/", { params }).then((r) => r.data);

// ─── Banner Images ───────────────────────────────────────────────────────────

export const getBannerImages = () =>
  apiClient.get("/banner-images/").then((r) => r.data);

// ─── Community ───────────────────────────────────────────────────────────────

export const getCommunityPosts = (params?: any) =>
  apiClient.get("/posts/", { params }).then((r) => r.data);

export const getCommunityPostById = (id: string) =>
  apiClient.get(`/posts/${id}/`).then((r) => r.data);

export const createCommunityPost = (data: any) =>
  apiClient.post("/posts/", data).then((r) => r.data);

export const updateCommunityPost = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/posts/${id}/`, data).then((r) => r.data);

export const deleteCommunityPost = (id: string) =>
  apiClient.delete(`/posts/${id}/`).then((r) => r.data);

export const getCommunityReplies = (postId: string) =>
  apiClient.get("/replies/", { params: { post_id: postId } }).then((r) => r.data);

export const createCommunityReply = (data: FormData) =>
  apiClient.post("/replies/", data).then((r) => r.data);

export const updateReply = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/replies/${id}/`, formData).then((r) => r.data);

export const getReplyById = (id: string) =>
  apiClient.get(`/replies/${id}/`).then((r) => r.data);

export const deleteReply = (id: string) =>
  apiClient.delete(`/replies/${id}/`).then((r) => r.data);

export const likeCommunityPost = (data: { post_id: string }) =>
  apiClient.post("/likes/toggle/", data).then((r) => r.data);

export const communityPostContactUs = (data: { post_id: string; message: string }) =>
  apiClient.post(`/posts/${data.post_id}/contact-creator/`, data).then((r) => r.data);


// ─── Scan QR ─────────────────────────────────────────────────────────────────

export const scanQRCode = (data: any) =>
  apiClient.post("/scan-qr/", data).then((r) => r.data);

// ─── Verify Report ───────────────────────────────────────────────────────────

export const verifyReport = (uuid: string) =>
  apiClient.get(`/verify-report/${uuid}/`).then((r) => r.data);

export const verifyVolunteerReport = ({ uuid }: { uuid: string }) =>
  apiClient.get(`/verify/${uuid}/`).then((r) => r.data);

// ─── Certificate ─────────────────────────────────────────────────────────────

export const getCertificate = (params?: any) =>
  apiClient.get("/certificate/", { params }).then((r) => r.data);

export const getVolunteerDetail = (params?: { page?: number; limit?: number; download?: boolean }) =>
  apiClient.get("/volunteer-detail/", { params }).then((r) => r.data);
