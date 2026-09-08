"use client";

import { useEffect, useMemo, useState } from "react";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FiDownload } from "react-icons/fi";
import { IoIosShareAlt } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import { Fancybox as NativeFancybox } from "@fancyapps/ui";

import Title from "@/components/shared/Title";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import UploadImageWithSave from "@/components/ui/UploadImageWithSave";
import EmailVerificationForm from "@/features/auth/components/EmailVerificationForm";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import LoginForm from "@/features/auth/components/LoginForm";
import RegisterVolunteerModalForm from "@/features/auth/components/RegisterVolunteerModalForm";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";
import VolunteerMandateDetails from "@/features/auth/components/VolunteerMandateDetails";
import { SponsorsClient } from "@/features/home";
import { closeVolunteerOpportunityRegistration, reopenVolunteerOpportunityRegistration, resubmitVolunteerOpportunity } from "@/features/opportunities/services/registrations";
import { deleteOpportunityImage, downloadOpportunityImage, getOpportunityById, sendVolunteerOpportunityCertificates, updateVolunteerOpportunityImages } from "@/features/opportunities/services/opportunities";
import {
  formatSingleDate,
  getDefaultProfileImage,
  handleShare,
  openLocation,
  toNumber,
} from "@/lib/helpers";
import { getCheckInCountdown, getCheckInWindow } from "@/features/opportunities/checkInWindow";
import { interestLabel, normalizeInterests } from "@/lib/interests";
import {
  getOpportunityButtonLabelKey,
  getOpportunityButtonState,
  isCreatorRepostState,
  isViewerOrganizer,
} from "@/features/shared/opportunityButtonState";
import { NAV_STATE_KEYS, clearNavState, getNavState, setNavState } from "@/lib/navigationState";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import ConfirmVolunteerRegistrationModal from "./ConfirmVolunteerRegistrationModal";
import DeleteOpportunityModal from "./DeleteOpportunityModal";
import OpportunityBadges, {
  OpportunityVisibilityInfo,
} from "./OpportunityBadges";
import OpportunitySponsors from "./OpportunitySponsors";
import UnregisterConfirmationModal from "./UnregisterConfirmationModal";
import VolunteerRegisterRoleModal, {
  VOLUNTEER_ROLE_REGISTRATION_FORM_ID,
} from "./VolunteerRegisterRoleModal";

interface ChoiceDisplay {
  id?: string;
  value_en?: string;
  value_ar?: string;
}

interface OpportunityImage {
  id: number;
  image: string;
  is_after_completed?: boolean;
}

export interface VolunteerOpportunityData {
  id: string | number;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  primary_language?: string;
  due_date?: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location_en?: string;
  location_ar?: string;
  location_url?: string | null;
  map_desc?: string | null;
  latitude?: number | string;
  longitude?: number | string;
  from_age?: number;
  to_age?: number;
  participants_needed?: number;
  registered_volunteers_count?: number;
  total_roles: number;
  opportunity_type?: string;
  opportunity_status?: string;
  action_state?: string;
  registration_link?: string;
  manual_tracking?: boolean;
  qr_attendance_enabled?: boolean;
  manual_attendance_enabled?: boolean;
  preparation_valid_until?: string | null;
  /** Hour-precise end of the check-in window; prefer it over the date-only field. */
  preparation_valid_until_at?: string | null;
  is_preparation_window_closed?: boolean;
  /** Set when an admin has reopened a window that had already closed. */
  preparation_reopened_until?: string | null;
  requires_check_in?: boolean;
  is_creator?: boolean;
  /** Per-viewer: "organizer" | "sponsor" | "registered" | "attended". */
  relationship_tags?: string[] | null;
  is_registered?: boolean;
  is_registration_closed?: boolean;
  is_registration_open?: boolean;
  approval_status?: string;
  rejected_reason?: string | null;
  is_public?: boolean;
  is_kuwaitis?: boolean;
  is_supports_disabled?: boolean;
  is_relief?: boolean;
  is_urgent?: boolean;
  is_emergency?: boolean;
  volunteer_category?: string | null;
  volunteer_category_display?: { en: string; ar: string } | null;
  beneficiaries_count?: number | null;
  supports_beneficiaries_count?: boolean;
  has_scan_permission?: boolean;
  after_completed_images_count?: number;
  gender_display?: ChoiceDisplay;
  interest_display?: Array<{
    id: string;
    value_en: string;
    value_ar: string;
  }> | null;
  interests?: Array<{
    id: number | string;
    name_en: string;
    name_ar: string;
    interest_type?: string;
  }> | null;
  license_image?: string | null;
  opportunity_images: OpportunityImage[];
  opportunity_sponsor_images?: Array<{
    id: number | string;
    image: string;
    organization: number;
    position: number;
  }>;
  created_by: {
    id: string | number;
    full_name?: string;
    profile_pic?: string | null;
    is_public?: boolean;
    gender_display?: ChoiceDisplay;
    facebook_link?: string | null;
    twitter_link?: string | null;
    whatsapp_link?: string | null;
    instagram_link?: string | null;
    linkedin_link?: string | null;
  };
}

/**
 * Which body the shared modal renders.
 * 1 = login, 2 = sign-up, 3 = role picker, 4 = confirm register, 5 = confirm unregister.
 */
type ModalState = 1 | 2 | 3 | 4 | 5;

const SOCIAL_LINKS = [
  { key: "facebook_link", icon: "/assets/profile/facebook.svg" },
  { key: "twitter_link", icon: "/assets/profile/twitter.svg" },
  { key: "whatsapp_link", icon: "/assets/profile/whatsapp.svg" },
  { key: "instagram_link", icon: "/assets/profile/instagram.svg" },
  { key: "linkedin_link", icon: "/assets/profile/linkdin.svg" },
] as const;

const TAG_BACKGROUNDS = ["#70B4C2", "#FC9555", "#D9EF61", "#5271FF"];
const TAG_TEXT_COLORS = [
  "text-primary-5",
  "text-primary-5",
  "text-primary-5",
  "text-white",
];

const LIST_BUTTON_CLASS =
  "xs4:w-[125px] 2xl:!text-lg xss:w-auto laptop:!w-full text-sm px-1 font-bold text-primary-5 border-b border-primary-5 xsmall:text-xs !rounded-[20px] md:h-[60px]";
const LIST_BUTTON_LABEL_CLASS =
  "xl:w-[140px] 2xl:w-[200px] lg:w-[95px] xsl:w-[150px] xss:w-[90px] smallscreen1:w-full smallscreen1:text-sm";

const parseIsoUtcDate = (value?: string | null) => {
  if (!value) return null;

  const parsedDate = moment.utc(value, moment.ISO_8601, true);
  return parsedDate.isValid() ? parsedDate : null;
};

export default function VolunteerEvent({
  opportunityId,
  organizationId,
}: {
  opportunityId: string;
  organizationId?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const user = useAuthStore((s) => s.user);
  const authToken = user?.auth_token;

  const id = opportunityId;

  const [open, setOpen] = useState(false);
  const [modalState, setModalState] = useState<ModalState>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpType, setOtpType] = useState("");
  const [showVolunteerMandateDetails, setShowVolunteerMandateDetails] =
    useState(false);
  const [mandateDetailsData, setMandateDetailsData] = useState<any>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState<{
    email: string;
    token: string;
  } | null>(null);

  const [showCloseRegistration, setShowCloseRegistration] = useState(false);
  const [showReopenRegistration, setShowReopenRegistration] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [showDeleteOpportunity, setShowDeleteOpportunity] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const opportunityQuery = useQuery({
    // The token is part of the key so logging in refetches with auth applied.
    queryKey: ["volunteer-opportunity", id, Boolean(authToken)],
    queryFn: () => getOpportunityById(id, Boolean(authToken)),
    enabled: Boolean(id),
  });

  const opportunityData = opportunityQuery.data?.data as
    | VolunteerOpportunityData
    | undefined;
  const refetch = opportunityQuery.refetch;

  // `/opportunities/{id}/details/` stopped sending `is_creator` and reports
  // ownership through `relationship_tags: ["organizer"]` instead, so all three
  // signals are ORed — see `isViewerOrganizer`. Losing the creator here hides
  // the whole sidebar block (List of Volunteers, Scan Permission) and sends the
  // creator's own Edit button into the registration modal.
  const isCreator = isViewerOrganizer(opportunityData, user?.id);

  const updateImagesMutation = useMutation({
    mutationFn: updateVolunteerOpportunityImages,
  });
  const deleteImageMutation = useMutation({ mutationFn: deleteOpportunityImage });
  const closeRegistrationMutation = useMutation({
    mutationFn: () => closeVolunteerOpportunityRegistration(id),
  });
  const reopenRegistrationMutation = useMutation({
    mutationFn: () => reopenVolunteerOpportunityRegistration(id),
  });
  const resubmitMutation = useMutation({
    mutationFn: () => resubmitVolunteerOpportunity(id),
  });
  const sendCertificatesMutation = useMutation({
    mutationFn: () => sendVolunteerOpportunityCertificates(id),
  });
  const downloadImageMutation = useMutation({
    mutationFn: downloadOpportunityImage,
  });

  const remainingParticipants = Math.max(
    0,
    toNumber(opportunityData?.participants_needed) -
    toNumber(opportunityData?.registered_volunteers_count)
  );

  const handleShowVolunteerMandateDetails = (userData: any) => {
    setMandateDetailsData(userData);
    setShowVolunteerMandateDetails(true);
  };

  // Fancybox previews the post-completion gallery in place of a new browser tab
  useEffect(() => {
    const galleryId = `opportunity-gallery-${id}`;
    NativeFancybox.bind(`[data-fancybox="${galleryId}"]`, {
      showClass: "fancybox-zoomIn",
      hideClass: "fancybox-zoomOut",
    });
    return () => {
      NativeFancybox.unbind(`[data-fancybox="${galleryId}"]`);
      NativeFancybox.close();
    };
  }, [id]);

  // A LinkedIn sign-up bounces through /linkedin-callback and lands back here
  // with the new user's profile stashed; pick it up once and clear it so a
  // refresh doesn't reopen the modal.
  useEffect(() => {
    const linkedinNewUserData = getNavState<any>(NAV_STATE_KEYS.linkedinNewUser);
    if (!linkedinNewUserData) return;
    clearNavState(NAV_STATE_KEYS.linkedinNewUser);
    setMandateDetailsData(linkedinNewUserData);
    setShowVolunteerMandateDetails(true);
  }, []);

  // Handle 404s
  useEffect(() => {
    const error = opportunityQuery.error as
      | { response?: { status?: number; data?: any } }
      | null;
    if (error?.response?.status !== 404) return;

    const errorData = error.response?.data;
    toast.error(
      (selectedLanguage === "ar" ? errorData?.message_ar : errorData?.message_en) ||
      t("COMMON.OPPORTUNITY_NOT_FOUND")
    );
    router.replace("/404");
  }, [opportunityQuery.error, selectedLanguage, t, router]);

  const handleFileUpload = async (files: File[]) => {
    const currentCount = opportunityData?.after_completed_images_count || 0;
    const maxAllowed = 10 - currentCount;

    if (files.length > maxAllowed) {
      toast.error(t("COMMON.MAX_FILES_EXCEEDED"));
      setPendingFiles([]);
      return;
    }

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`new_opportunity_images_${index}`, file);
      formData.append(
        `new_opportunity_images_is_after_completed_${index}`,
        "true"
      );
    });

    try {
      await updateImagesMutation.mutateAsync({ id, formData });
      toast.success(t("COMMON.TOAST.OPPORTUNITY_IMAGE_UPLOAD_SUCCESS"));
      setPendingFiles([]);
      refetch();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(t("COMMON.TOAST.OPPORTUNITY_IMAGE_UPLOAD_FAILED"));
    }
  };

  /** Creator-only: stop accepting registrations without waiting for the due date. */
  const handleCloseRegistration = async () => {
    try {
      await closeRegistrationMutation.mutateAsync();
      toast.success(t("COMMON.TOAST.CLOSE_REGISTRATION_SUCCESS"));
      setShowCloseRegistration(false);
      refetch();
    } catch (error) {
      console.error("Close registration failed:", error);
      toast.error(t("COMMON.TOAST.CLOSE_REGISTRATION_FAILED"));
    }
  };

  /**
   * Creator-only: issue certificates for anyone marked attended since the
   * automatic pass at completion. `certificates_sent: 0` is a normal answer,
   * not a failure — it means nothing new was eligible.
   */
  const handleSendCertificates = async () => {
    try {
      const response = await sendCertificatesMutation.mutateAsync();
      const sent = response?.data?.certificates_sent ?? 0;
      if (sent > 0) {
        toast.success(t("COMMON.TOAST.CERTIFICATES_SENT", { count: sent }));
      } else {
        toast.info(t("COMMON.TOAST.NO_CERTIFICATES_TO_SEND"));
      }
    } catch (error) {
      console.error("Send certificates failed:", error);
      toast.error(t("COMMON.TOAST.CERTIFICATES_SEND_FAILED"));
    }
  };

  /** Creator-only: undo an earlier close-registration. */
  const handleReopenRegistration = async () => {
    try {
      await reopenRegistrationMutation.mutateAsync();
      toast.success(t("COMMON.TOAST.REOPEN_REGISTRATION_SUCCESS"));
      setShowReopenRegistration(false);
      refetch();
    } catch (error) {
      console.error("Reopen registration failed:", error);
      toast.error(t("COMMON.TOAST.REOPEN_REGISTRATION_FAILED"));
    }
  };

  /** Creator-only: send a rejected opportunity back into the admin review queue as-is. */
  const handleResubmit = async () => {
    try {
      await resubmitMutation.mutateAsync();
      toast.success(t("COMMON.TOAST.RESUBMIT_SUCCESS"));
      setShowResubmit(false);
      refetch();
    } catch (error) {
      console.error("Resubmit failed:", error);
      toast.error(t("COMMON.TOAST.RESUBMIT_FAILED"));
    }
  };

  const handleShowEmailVerification = (email: string, type: string) => {
    setVerificationEmail(email);
    setOtpType(type);
    setShowEmailVerification(true);
  };

  const handleShowLogin = () => {
    setModalState(1);
    setOpen(true);
  };

  const handleShowForgotPassword = () => {
    setShowForgotPassword(true);
    setOpen(false);
  };

  const handleShowResetPassword = (email: string, token: string) => {
    setResetPasswordData({ email, token });
    setShowResetPassword(true);
    setShowEmailVerification(false);
  };


  const getTitle = () => {
    switch (modalState) {
      case 1:
        return t("COMMON.JOINUS");
      case 2:
        return t("COMMON.SIGN.UP");
      case 3:
        return t("COMMON.ROLE");
      case 4:
        return t("COMMON.CONFIRM_REGISTRATION");
      case 5:
        return t("COMMON.CONFIRM_UNREGISTRATION");
    }
  };

  const handleRegisterClick = () => {
    if (isCreator) {
      setNavState(NAV_STATE_KEYS.volunteerForm, { id });
      router.push("/volunteer-form");
      return;
    }

    if (authToken) {
      if (user?.is_banned === true && !opportunityData?.is_registered) {
        toast.error(t("COMMON.BANNED_USER_CANNOT_REGISTER"));
        return;
      }
      if (opportunityData?.is_registered) {
        setModalState(5);
      } else if ((opportunityData?.total_roles ?? 0) > 0) {
        setModalState(3);
      } else {
        setModalState(4);
      }
    } else {
      setModalState(1);
    }
    setOpen(true);
  };

  /** Reposting starts a *new* opportunity seeded from this one. */
  const handleRepublishClick = () => {
    setNavState(NAV_STATE_KEYS.volunteerForm, { id, isRepublish: true });
    router.push("/volunteer-form");
  };

  const goToVolunteerList = () => {
    setNavState(NAV_STATE_KEYS.registerList, {
      id: opportunityData?.id,
      opportunity_status: opportunityData?.opportunity_status,
      // Manual attendance runs alongside QR; the backend owns the deadline.
      manual_tracking:
        getCheckInWindow(opportunityData).manualEnabled &&
        getCheckInWindow(opportunityData).isOpen,
      requires_check_in: opportunityData?.requires_check_in,
      qr_attendance_enabled: opportunityData?.qr_attendance_enabled,
      manual_attendance_enabled: opportunityData?.manual_attendance_enabled,
      preparation_valid_until: opportunityData?.preparation_valid_until,
      preparation_valid_until_at: opportunityData?.preparation_valid_until_at,
      is_preparation_window_closed:
        opportunityData?.is_preparation_window_closed,
      preparation_reopened_until: opportunityData?.preparation_reopened_until,
      // Deleting registrations is locked once the opportunity has begun
      disableDeleteAfterPeriod: moment().isAfter(
        moment(opportunityData?.start_date).startOf("day")
      ),
      start_date: opportunityData?.start_date,
      end_date: opportunityData?.end_date,
      start_time: opportunityData?.start_time,
      end_time: opportunityData?.end_time,
      participants_needed: opportunityData?.participants_needed,
    });
    router.push("/volunteerlist");
  };

  const goToScanPermission = () => {
    setNavState(NAV_STATE_KEYS.scanPermission, {
      id: opportunityData?.id,
      opportunity_status: opportunityData?.opportunity_status,
    });
    router.push("/scan-permission");
  };

  const openDeleteModal = (imageId: number) => {
    setDeletingImageId(imageId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingImageId) return;
    try {
      await deleteImageMutation.mutateAsync({
        image_ids: [deletingImageId],
        type: "volunteer",
      });
      toast.success(t("COMMON.TOAST.DELETE_IMAGE_SUCCESS"));
      setShowDeleteModal(false);
      setDeletingImageId(null);
      refetch();
    } catch {
      toast.error(t("COMMON.TOAST.DELETE_IMAGE_FAILED"));
    }
  };

  const handleDownloadImage = async (
    imageId: number,
    imageName = "opportunity_image"
  ) => {
    try {
      const { blob, filename } = await downloadImageMutation.mutateAsync({
        image_id: imageId,
        fallbackName: imageName,
      });

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success(t("COMMON.DOWNLOAD_SUCCESS"));
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("COMMON.DOWNLOAD_FAILURE"));
    }
  };

  const opportunityDetails = {
    title_ar: opportunityData?.title_ar,
    title_en: opportunityData?.title_en,
    start_date: opportunityData?.start_date,
  };

  const afterCompletedImages = useMemo(
    () =>
      opportunityData?.opportunity_images?.filter(
        (image) => image.is_after_completed
      ) ?? [],
    [opportunityData]
  );

  const interestTags = useMemo(
    () =>
      normalizeInterests(
        opportunityData?.interest_display,
        opportunityData?.interests
      ),
    [opportunityData]
  );

  /**
   * Total commitment = hours per day × number of days in the range (inclusive).
   */
  const totalDuration = useMemo(() => {
    if (!opportunityData) return { hrs: 0, mins: 0 };
    const hoursPerDay = moment
      .duration(
        moment(opportunityData.end_time, "HH:mm:ss").diff(
          moment(opportunityData.start_time, "HH:mm:ss")
        )
      )
      .asHours();
    const numberOfDays =
      moment(opportunityData.end_date).diff(
        moment(opportunityData.start_date),
        "days"
      ) + 1;
    const totalHours = hoursPerDay * numberOfDays;
    const hrs = Math.floor(totalHours);
    return { hrs, mins: Math.round((totalHours - hrs) * 60) };
  }, [opportunityData]);

  if (opportunityQuery.isLoading) {
    return <Loader />;
  }

  const nowUtc = moment.utc();
  const dueDate = parseIsoUtcDate(opportunityData?.due_date);
  const startDate = parseIsoUtcDate(opportunityData?.start_date);
  const endDate = parseIsoUtcDate(opportunityData?.end_date);
  const status = opportunityData?.opportunity_status?.toLowerCase();
  const startsInFuture = Boolean(startDate?.isAfter(nowUtc, "day"));

  // Some legacy records are marked completed even though their scheduled
  // start is still in the future. Prefer the schedule for that contradictory
  // state so an otherwise open opportunity keeps its registration action.
  const isCompleted = status === "completed" && !startsInFuture;
  const registrationDeadline = dueDate ?? startDate ?? endDate;
  // The creator can also close registration by hand before the deadline, which
  // the backend reports through is_registration_closed / is_registration_open.
  const closedByCreator =
    opportunityData?.is_registration_closed === true ||
    opportunityData?.is_registration_open === false;
  const isRegistrationClosed =
    closedByCreator ||
    Boolean(registrationDeadline && nowUtc.isAfter(registrationDeadline, "day"));
  const participantsNeeded = toNumber(opportunityData?.participants_needed);
  const registeredVolunteers = toNumber(
    opportunityData?.registered_volunteers_count
  );
  const isFull =
    participantsNeeded > 0 && registeredVolunteers >= participantsNeeded;
  const hasStarted = moment().isAfter(
    moment(opportunityData?.start_date).startOf("day")
  );
  // `action_state` (backend-computed) is authoritative when present — it
  // sidesteps the date heuristic's same-day bug, where a same-day event shows
  // "Repost" from midnight regardless of its actual start time.
  const isRepostState =
    isCreator &&
    (opportunityData?.action_state
      ? isCreatorRepostState(opportunityData)
      : isCompleted || status === "inprogress" || hasStarted);

  /**
   * A valid due date is the primary registration cutoff. Older records can
   * have no due date, so their scheduled start/end date provides a safe
   * fallback instead of suppressing the action entirely.
   */
  // The creator's own manage action (Edit/Repost) isn't gated behind
  // verification — the list cards never hid it for an unverified creator
  // either, only the register/unregister action for other viewers does.
  const showActionButton =
    isCreator ||
    ((user ? user.is_verified === true : true) &&
      !isCompleted &&
      !isRegistrationClosed &&
      (opportunityData?.is_registered ||
        (user?.user_type !== "organization" && !isFull)));

  // Only worth offering while the opportunity is still taking registrations.
  const canCloseRegistration =
    isCreator && !isCompleted && !isRegistrationClosed && !isRepostState;
  // Reopening only makes sense after the creator explicitly closed it early —
  // a window closed by its due date passing reopens on its own schedule.
  const canReopenRegistration =
    isCreator && opportunityData?.is_registration_closed === true;
  const isRejected = opportunityData?.approval_status === "rejected";
  // Match the opportunity cards: deletion can only be requested by the
  // creator before the opportunity starts or completes.
  const canRequestDeletion =
    isCreator && status !== "completed" && status !== "inprogress";
  /**
   * Completion issues certificates for everyone already marked attended, so
   * this action exists for attendance recorded after that automatic pass — it
   * is only offered once the opportunity is actually completed, and is safe to
   * press more than once (BE-14).
   */
  const canSendCertificates = isCreator && status === "completed";

  /**
   * Six states off the API's own flags — Ended / Started / Full / Closed /
   * Unregister / Register — with the creator's own manage actions taking
   * precedence, and the unauthenticated "Register now" wording preserved.
   */
  const viewerButtonState = getOpportunityButtonState(opportunityData);
  const actionButtonLabel = isRejected
    ? t("COMMON.EDIT_AND_RESUBMIT")
    : isRepostState
      ? t("COMMON.REPOST")
      : isCreator
        ? t("COMMON.EDIT_TEXT")
        : viewerButtonState === "register" && !authToken
          ? t("COMMON.REGISTER_NOW")
          : t(getOpportunityButtonLabelKey(viewerButtonState));

  const organizerPath = !opportunityData?.created_by?.is_public
    ? `/volunteer-private-profile/${opportunityData?.created_by?.id}`
    : `/public-profile/${opportunityData?.created_by?.id}`;

  // The description is always shown in full — the View More toggle was removed.
  const description =
    (opportunityData?.primary_language === "ar"
      ? opportunityData?.description_ar
      : opportunityData?.description_en) || "";

  /**
   * The attendance window, its deadline and whether it is still open all come
   * from the backend — the default is 72 hours past the end date and admins can
   * change it, so nothing is recomputed here. See `lib/checkInWindow.ts`.
   */
  const checkInWindow = getCheckInWindow(opportunityData);
  const checkInCountdown = getCheckInCountdown(checkInWindow);

  /**
   * QR and manual attendance work side by side — `manual_tracking` no longer
   * hides the scanner. Workshops and consultations set
   * `requires_check_in: false` and get no attendance surface at all.
   */
  const canShowScanPermission = isCreator && checkInWindow.qrEnabled;
  const canShowScanQR =
    !isCreator &&
    opportunityData?.has_scan_permission &&
    checkInWindow.qrEnabled &&
    checkInWindow.isOpen;
  // A non-creator scanner gets the button only on mobile, where scanning happens
  const shouldShowOnlyMobile = !isCreator && canShowScanQR;

  return (
    <div className={`w-full ${selectedLanguage === "ar" ? "rlt" : "ltr"}`}>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={getTitle()}
        size={modalState === 2 ? "md" : "sm"}
        disableFilterModalClass
        footer={
          modalState === 3 ? (
            <div className="flex justify-center w-full gap-5">
              <Button
                variant="primary"
                size="medium"
                type="submit"
                form={VOLUNTEER_ROLE_REGISTRATION_FORM_ID}
                className="xss:!w-full"
                disabled={isSubmitting}
              >
                {t("COMMON.CONFIRM")}
              </Button>
            </div>
          ) : null
        }
      >
        {modalState === 1 ? (
          <LoginForm
            isModal
            onClose={() => setOpen(false)}
            onShowEmailVerification={(email) => {
              setOpen(false);
              setVerificationEmail(email);
              setOtpType("register");
              setShowEmailVerification(true);
            }}
            onShowRegistration={() => {
              setModalState(2);
              setOpen(true);
            }}
            onShowVolunteerMandateDetails={handleShowVolunteerMandateDetails}
            onShowForgotPassword={handleShowForgotPassword}
          />
        ) : modalState === 2 ? (
          <RegisterVolunteerModalForm
            onClose={() => setOpen(false)}
            onShowEmailVerification={handleShowEmailVerification}
            onShowVolunteerMandateDetails={handleShowVolunteerMandateDetails}
          />
        ) : modalState === 4 ? (
          <ConfirmVolunteerRegistrationModal
            opportunityId={id}
            onClose={() => setOpen(false)}
            refetch={refetch}
            organizationId={organizationId}
            opportunityDetails={opportunityDetails}
          />
        ) : modalState === 5 ? (
          <UnregisterConfirmationModal
            opportunityId={id}
            onClose={() => setOpen(false)}
            refetch={refetch}
          />
        ) : (
          <VolunteerRegisterRoleModal
            opportunityId={id}
            organizationId={organizationId}
            onLoadingChange={setIsSubmitting}
            onClose={() => setOpen(false)}
            opportunityDetails={opportunityDetails}
          />
        )}
      </Modal>

      <Modal
        open={showEmailVerification}
        onClose={() => setShowEmailVerification(false)}
        title={t("COMMON.EMAIL_VERIFICATION")}
        size="md"
      >
        <EmailVerificationForm
          email={verificationEmail}
          otp_type={otpType}
          onClose={() => setShowEmailVerification(false)}
          onShowLogin={handleShowLogin}
          onShowResetPassword={handleShowResetPassword}
          isModal
        />
      </Modal>

      <Modal
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        title={t("COMMON.FORGOT_PASSWORD")}
        size="sm"
      >
        <ForgotPasswordForm
          onShowEmailVerification={handleShowEmailVerification}
          onClose={() => setShowForgotPassword(false)}
          isModal
        />
      </Modal>

      <Modal
        open={showResetPassword}
        onClose={() => setShowResetPassword(false)}
        title={t("COMMON.RESET_PASSWORD")}
        size="md"
      >
        <ResetPasswordForm
          email={resetPasswordData?.email || ""}
          token={resetPasswordData?.token || ""}
          onClose={() => setShowResetPassword(false)}
          onShowLogin={handleShowLogin}
          isModal
        />
      </Modal>

      <Modal
        open={showVolunteerMandateDetails}
        onClose={() => setShowVolunteerMandateDetails(false)}
        title={t("COMMON.COMPLETEYOURDETAILS")}
        size="md"
      >
        <VolunteerMandateDetails
          userData={mandateDetailsData}
          onClose={() => setShowVolunteerMandateDetails(false)}
          isModal
        />
      </Modal>

      <div className="relative w-full">
        {/* `object-cover` crops to the strip without ever stretching, so the
            uploaded square keeps its proportions. */}
        <img
          className="w-full h-[320px] object-cover"
          src={opportunityData?.opportunity_images?.[0]?.image}
          alt=""
        />
        {opportunityData && <OpportunityBadges item={opportunityData} />}
      </div>

      <div className="w-[90%] mobilescreen:w-[100%] py-[40px] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] lg:mx-0 md:mx-auto mx-auto">
        <div className="grid grid-cols-1 2xl:grid-cols-[470px_auto] xl:grid-cols-[435px_auto] lg:grid-cols-[380px_auto] 2xl:gap-[69px] gap-0 lg:gap-[30px] md:gap-6">
          {/* Left column — organizer */}
          <div>
            <div>
              <div className="flex flex-col items-center">
                <Link href={organizerPath}>
                  <img
                    src={
                      opportunityData?.created_by?.profile_pic ||
                      getDefaultProfileImage(
                        opportunityData?.created_by?.gender_display?.value_en,
                        "/assets/profile/male_profile.svg",
                        "/assets/profile/female_profile.svg",
                        "/assets/profile/org_profile.svg"
                      )
                    }
                    alt={opportunityData?.created_by?.full_name}
                    className="bg-white relative z-10 2xl:w-[300px] lg:w-[200px] w-[200px] xss:w-[130px] 2xl:h-[300px] lg:h-[200px] h-[200px] xss:h-[130px] object-cover rounded-full border-2 border-primary-5"
                  />
                </Link>

                <div className="w-[100%] flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] bottom-[50px] lg:pt-[137px] md:pt-[80px] pt-[80px] lg:bottom-[100px] px-[20px] 2xl:pb-[70px] lg:pb-[40px] pb-[40px]">
                  <Link href={organizerPath}>
                    <div className="w-[252px] text-center shadow-[0px_4px_4px_0px_#00000040] bg-primary-5 rounded-[20px] text-white p-[24px]">
                      <h3 className="2xl:text-xl lg:text-base text-base font-bold text-white">
                        {opportunityData?.created_by?.full_name}
                      </h3>
                    </div>
                  </Link>

                  <div className="w-full pt-8 text-center">
                    {SOCIAL_LINKS.some(
                      ({ key }) => opportunityData?.created_by?.[key]
                    ) && (
                        <div>
                          <div className="mt-3 flex gap-3 justify-center">
                            {SOCIAL_LINKS.map(({ key, icon }) => {
                              const href = opportunityData?.created_by?.[key];
                              if (!href) return null;
                              return (
                                <a
                                  key={key}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  href={href}
                                >
                                  <img
                                    className="w-[31px] h-[31px]"
                                    src={icon}
                                    alt=""
                                  />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>

                  {isCreator && !opportunityData?.is_public && (
                    <button
                      type="button"
                      onClick={() =>
                        handleShare(opportunityData?.registration_link || "", t)
                      }
                      className="mt-[50px] mobilescreen:mt-[30px] flex items-center text-primary-200 font-medium"
                    >
                      <span className="mr-1 flex gap-2 text-primary-5 items-center 2xl:text-xl lg:text-base text-base font-bold">
                        <IoIosShareAlt className="w-6 h-6" />
                        {t("COMMON.SHARE")}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/*  License image */}
             {opportunityData?.license_image && (
                <div className="w-full flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] bottom-[50px] lg:bottom-[100px] px-[20px] pb-[30px] pt-[20px]">
                  <p className="text-primary-5 2xl:text-base lg:text-sm text-sm font-bold mb-3">
                    {t("COMMON.LICENSE")}
                  </p>
                  <a
                    href={opportunityData.license_image}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("COMMON.LICENSE")}
                  >
                    <img
                      src={opportunityData.license_image}
                      alt={t("COMMON.LICENSE")}
                      className="max-w-full max-h-[200px] object-contain rounded-lg border border-gray-300 shadow hover:opacity-90 transition-opacity cursor-pointer"
                    />
                  </a>
                </div>
              )}

              <div
                className={`mobilescreen:bottom-[50px] sponseritm bg-[#DBDBDB] 2xl:bottom-[100px] lg:bottom-[100px] md:bottom-[60px] relative 2xl:p-[50px] laptopmain:px-12 laptops:px-10 lg:p-[30px] p-[30px] ${!opportunityData?.opportunity_sponsor_images?.length
                  ? "hidden"
                  : ""
                  }`}
              >
                <OpportunitySponsors
                  sponsors={
                    opportunityData?.opportunity_sponsor_images?.map((image) => ({
                      id: Number(image.id),
                      image: image.image,
                      organization: image.organization,
                      position: image.position,
                    })) || []
                  }
                />
              </div>

              {(isCreator || canShowScanQR) && (
                <div
                  className={`w-[100%] flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] msscreen1:bottom-[70px] mdscreen:bottom-[75px] bottom-[50px] pt-[50px] lg:bottom-[100px] px-5 2xl:pb-[70px] lg:pb-[40px] pb-[40px] ${shouldShowOnlyMobile ? "hidden miniscreen9:flex" : ""
                    }`}
                >
                  {/* Desktop / tablet: no Scan QR here */}
                  {isCreator && (
                    <div className="flex gap-5 items-center extrasmall:gap-[10px] miniscreen9:hidden">
                      <Button
                        variant="primary"
                        size="medium"
                        onClick={goToVolunteerList}
                        className={LIST_BUTTON_CLASS}
                      >
                        <span className={LIST_BUTTON_LABEL_CLASS}>
                          {t("COMMON.LIST_OF_VOLUNTEERS")}
                        </span>
                      </Button>
                      {canShowScanPermission && (
                        <Button
                          variant="primary"
                          size="medium"
                          onClick={goToScanPermission}
                          className={LIST_BUTTON_CLASS}
                        >
                          <span className={LIST_BUTTON_LABEL_CLASS}>
                            {t("COMMON.SCAN_PERMISSION")}
                          </span>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Mobile: two rows */}
                  {isCreator && (
                    <div className="hidden smallscreen1:!flex-col miniscreen9:flex miniscreen9:flex-row flex-col gap-2 w-fit min-w-[0] relative">
                      <div className="flex miniscreen9:block items-start justify-start gap-x-2 smallscreen:gap-x-2 pb-2 smallscreen1:pb-0">
                        <Button
                          variant="primary"
                          size="medium"
                          onClick={goToVolunteerList}
                          className={`${LIST_BUTTON_CLASS} smallscreen1:w-full smallscreen1:text-sm`}
                        >
                          <span className={LIST_BUTTON_LABEL_CLASS}>
                            {t("COMMON.LIST_OF_VOLUNTEERS")}
                          </span>
                        </Button>
                      </div>

                      {canShowScanPermission && (
                        <div className="smallscreen1:flex-col smallscreen1:gap-2 flex items-start justify-start w-full gap-x-2 smallscreen:gap-x-2">
                          <Button
                            variant="primary"
                            size="medium"
                            onClick={goToScanPermission}
                            className={`${LIST_BUTTON_CLASS} smallscreen1:w-full smallscreen1:text-sm`}
                          >
                            <span className={LIST_BUTTON_LABEL_CLASS}>
                              {t("COMMON.SCAN_PERMISSION")}
                            </span>
                          </Button>
                          {checkInWindow.isOpen && (
                            <Button
                              variant="primary"
                              size="medium"
                              onClick={() =>
                                router.push(`/scan-qr?opportunity_id=${id}`)
                              }
                              className={`${LIST_BUTTON_CLASS} smallscreen1:w-full smallscreen1:text-sm`}
                            >
                              <span className="xl:w-[150px] lg:w-[95px] xsl:w-[150px] xss:w-[90px] smallscreen1:w-full smallscreen1:text-sm">
                                {t("COMMON.SCAN_QR_CODE")}
                              </span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delegated scanner (not the creator): mobile only */}
                  {canShowScanQR && (
                    <div className="hidden miniscreen9:flex flex-col gap-2 w-full min-w-[0] relative items-center">
                      <Button
                        variant="primary"
                        size="medium"
                        onClick={() =>
                          router.push(`/scan-qr?opportunity_id=${id}`)
                        }
                        className="w-full 2xl:!text-lg smallscreen1:text-sm text-sm px-4 font-bold text-primary-5 border-b border-primary-5 !rounded-[20px] md:h-[60px]"
                      >
                        <span className="w-full text-center smallscreen1:text-sm">
                          {t("COMMON.SCAN_QR_CODE")}
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column — opportunity details */}
          <div className="lg:pt-[70px] md:pt-0 mobilescreen:pt-0">
            <div className="mobilescreen:w-[90%] mobilescreen:mx-auto">
              <div className="flex justify-between items-start">
                <h2 className="lg:w-[75%] md:w-[75%] pb-5 mediumscreen1:w-[70%] xsl:w-[80%] xss:w-full">
                  <Title
                    text={
                      (opportunityData?.primary_language === "ar"
                        ? opportunityData?.title_ar
                        : opportunityData?.title_en) || ""
                    }
                    variant="default"
                    hasMargin={false}
                    className="2xl:leading-[50px] lg:leading-[40px] md:leading-[42px] mediumscreen1:leading-[44px] mobilescreen:leading-[32px] text-start"
                  />
                  <OpportunityVisibilityInfo
                    isPublic={opportunityData?.is_public}
                    showLabel
                    className="text-secondary-102"
                  />
                </h2>

                <div className="flex flex-col items-end gap-2">
                  {showActionButton && (
                    <Button
                      variant="primary"
                      size="medium"
                      className="whitespace-nowrap block xss:hidden"
                      onClick={
                        isRepostState ? handleRepublishClick : handleRegisterClick
                      }
                    >
                      {actionButtonLabel}
                    </Button>
                  )}

                  {/* The creator can close registration before the due date */}
                  {canCloseRegistration && (
                    <Button
                      variant="secondary"
                      size="medium"
                      className="whitespace-nowrap block xss:hidden"
                      onClick={() => setShowCloseRegistration(true)}
                    >
                      {t("COMMON.CLOSE_REGISTRATION")}
                    </Button>
                  )}

                  {closedByCreator && (
                    <span className="whitespace-nowrap rounded-[20px] bg-[#F1F1F5] px-4 py-2 text-sm font-bold text-secondary-102">
                      {t("COMMON.REGISTRATION_CLOSED")}
                    </span>
                  )}

                  {canReopenRegistration && (
                    <Button
                      variant="secondary"
                      size="medium"
                      className="whitespace-nowrap block xss:hidden"
                      onClick={() => setShowReopenRegistration(true)}
                    >
                      {t("COMMON.REOPEN_REGISTRATION")}
                    </Button>
                  )}

                  {isRejected && (
                    <Button
                      variant="secondary"
                      size="medium"
                      className="whitespace-nowrap block xss:hidden"
                      onClick={() => setShowResubmit(true)}
                    >
                      {t("COMMON.RESUBMIT_WITHOUT_EDIT")}
                    </Button>
                  )}

                  {canSendCertificates && (
                    <Button
                      variant="secondary"
                      size="medium"
                      className="whitespace-nowrap block xss:hidden"
                      onClick={handleSendCertificates}
                      disabled={sendCertificatesMutation.isPending}
                    >
                      {t("COMMON.SEND_CERTIFICATES")}
                    </Button>
                  )}

                  {/* Labelled like the other manage actions rather than a bare
                      icon, so the destructive one isn't the only unlabelled
                      control in the column. No `xss:hidden`: its siblings have
                      a full-width mobile counterpart further down and this one
                      doesn't, so hiding it would drop delete on mobile. */}
                  {canRequestDeletion && (
                    <Button
                      variant="secondary"
                      size="medium"
                      className="whitespace-nowrap"
                      onClick={() => setShowDeleteOpportunity(true)}
                    >
                      {t("COMMON.DELETE_OPPORTUNITY")}
                    </Button>
                  )}
                </div>
              </div>

              {isRejected && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-bold">{t("COMMON.OPPORTUNITY_REJECTED")}</p>
                  {opportunityData?.rejected_reason && (
                    <p className="mt-1">
                      {t("COMMON.REJECTION_REASON")}: {opportunityData.rejected_reason}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center text-gray-600 text-sm pb-5 mobilescreen:pb-3.5 gap-2">
                <img
                  className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                  src="/assets/homepage/duedate.svg"
                  alt=""
                />
                <p className="text-primary-5 2xl:text-xl lg:text-base text-base font-bold">
                  {t("COMMON.DUE_DATE")} :
                  <span className="text-secondary-102 font-bold">
                    {" "}
                    {dueDate
                      ? formatSingleDate(
                        dueDate.format("YYYY-MM-DD"),
                        selectedLanguage,
                        t
                      )
                      : t("COMMON.NO_DATA_AVAILABLE")}
                  </span>
                </p>
              </div>

              <div className="flex items-center text-gray-600 text-sm pb-5 mobilescreen:pb-3.5 gap-2">
                <img
                  src="/assets/homepage/learn_type.svg"
                  className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                  alt="Learning Type"
                />
                <p className="text-primary-5 2xl:text-xl lg:text-base text-base font-bold">
                  {" "}
                  {t("COMMON.TYPE")} :
                  <span className="text-secondary-102 font-bold">
                    {" "}
                    {opportunityData?.opportunity_type === "volunteer_opportunity"
                      ? t("COMMON.VOLUNTEER")
                      : t("COMMON.ORGANIZATION")}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="flex items-center pb-5 mobilescreen:pb-3.5 gap-2">
                  <img
                    className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                    src="/assets/homepage/dateicn.svg"
                    alt=""
                  />
                  <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                    {t("COMMON.START.DATE")} :
                  </p>
                  <p className="font-bold text-secondary-102 2xl:text-xl lg:text-base text-base">
                    {formatSingleDate(
                      opportunityData?.start_date || "",
                      selectedLanguage,
                      t
                    )}
                  </p>
                </div>
                <div className="flex items-center pb-5 mobilescreen:pb-3.5 gap-2">
                  <img
                    className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                    src="/assets/homepage/dateicn.svg"
                    alt=""
                  />
                  <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                    {t("COMMON.END.DATE")} :
                  </p>
                  <p className="font-bold text-secondary-102 2xl:text-xl lg:text-base text-base">
                    {formatSingleDate(
                      opportunityData?.end_date || "",
                      selectedLanguage,
                      t
                    )}
                  </p>
                </div>
                {opportunityData?.start_time &&
                  opportunityData?.end_time &&
                  moment(opportunityData.start_time, "HH:mm:ss", true).isValid() &&
                  moment(opportunityData.end_time, "HH:mm:ss", true).isValid() && (
                  <div className="flex items-center font-bold 2xl:text-xl lg:text-base text-base gap-2">
                    <img
                      className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                      src="/assets/homepage/timeicn.svg"
                      alt=""
                    />
                    <p className="text-secondary-102 font-bold">
                      {moment(opportunityData.start_time, "HH:mm:ss").format("hh:mm")}
                    </p>
                    <p className="text-primary-5">
                      {moment(opportunityData.start_time, "HH:mm:ss").format("a") === "am"
                        ? t("COMMON.AM")
                        : t("COMMON.PM")}{" "}
                    </p>
                    <p className="text-secondary-102 font-bold">
                      -{" "}
                      {moment(opportunityData.end_time, "HH:mm:ss").format("hh:mm")}
                    </p>
                    <p className="text-primary-5">
                      {moment(opportunityData.end_time, "HH:mm:ss").format("a") === "am"
                        ? t("COMMON.AM")
                        : t("COMMON.PM")}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-b mb-6">
                <div className="flex mt-5 mobilescreen:mt-3.5 xss:flex-col">
                  <div className="w-1/2 xss:w-full">
                    {opportunityData?.start_time && opportunityData?.end_time && (
                      <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                        <img
                          className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                          src="/assets/homepage/hours.svg"
                          alt=""
                        />
                        {totalDuration.hrs > 0 && (
                          <>
                            <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                              {totalDuration.hrs}
                            </p>
                            <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                              {t("COMMON.HR")}
                            </p>
                          </>
                        )}
                        {totalDuration.mins > 0 && (
                          <>
                            <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                              {totalDuration.mins}
                            </p>
                            <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                              {t("COMMON.MIN")}
                            </p>
                          </>
                        )}
                        {totalDuration.hrs === 0 && totalDuration.mins === 0 && (
                          <>
                            <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                              0
                            </p>
                            <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                              {t("COMMON.MIN")}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      <img
                        className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                        src="/assets/voluneteerevent/age.svg"
                        alt=""
                      />
                      <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                        {t("COMMON.AGE")} :
                      </p>
                      <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                        {opportunityData?.from_age}
                        {opportunityData?.to_age ? (
                          <>
                            <span className="text-secondary-102 font-bold"> - </span>
                            {opportunityData?.to_age}
                          </>
                        ) : (
                          <span className="text-primary-5 font-bold"> + </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      <img
                        className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                        src="/assets/homepage/person.svg"
                        alt=""
                      />
                      <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                        {remainingParticipants}
                      </p>
                      <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                        {t("COMMON.NEEDED")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      <img
                        className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                        src="/assets/voluneteerevent/gender.svg"
                        alt=""
                      />
                      <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                        {t("COMMON.GENDER")} :
                      </p>
                      <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                        {
                          opportunityData?.gender_display?.[
                          selectedLanguage === "ar" ? "value_ar" : "value_en"
                          ]
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      <img
                        className={`${selectedLanguage === "ar"
                          ? "ml-3 right-[3px]"
                          : "mr-3 left-[3px]"
                          } w-5 h-5 object-contain relative`}
                        src="/assets/homepage/locations.svg"
                        alt=""
                      />
                      <div>
                        <p
                          onClick={() =>
                            openLocation(
                              null,
                              opportunityData?.latitude,
                              opportunityData?.longitude
                            )
                          }
                          className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold cursor-pointer hover:underline"
                          title={
                            (selectedLanguage === "ar"
                              ? opportunityData?.location_ar
                              : opportunityData?.location_en) ||
                            opportunityData?.map_desc ||
                            t("COMMON.ADDRESS_NOT_FOUND")
                          }
                        >
                          {(selectedLanguage === "ar"
                            ? opportunityData?.location_ar
                            : opportunityData?.location_en) ||
                            opportunityData?.map_desc ||
                            t("COMMON.ADDRESS_NOT_FOUND")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-1/2 xss:w-full">
                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      <img
                        className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                        src="/assets/voluneteerevent/nationality.svg"
                        alt=""
                      />
                      <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                        {opportunityData?.is_kuwaitis === true
                          ? t("COMMON.KUWAITIS.ONLY")
                          : t("COMMON.ALL.NATIONALITY")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      <img
                        className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                        src="/assets/voluneteerevent/peoplewithdisabilities.svg"
                        alt=""
                      />
                      <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                        {t("COMMON.SUPPORTS_PEOPLE_WITH_DISABILITIES")}
                      </p>
                      <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                        {opportunityData?.is_supports_disabled === true
                          ? t("COMMON.YES")
                          : t("COMMON.NO")}
                      </p>
                    </div>

                    {/* Relief takes the first slot; urgent falls back into it */}
                    {opportunityData?.is_relief ? (
                      <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                        <img
                          className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                          src="/assets/voluneteerevent/relief.svg"
                          alt=""
                        />
                        <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                          {t("COMMON.RELIEF.DETAILS")}
                        </p>
                        <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                          {t("COMMON.YES")}
                        </p>
                      </div>
                    ) : opportunityData?.is_urgent ? (
                      <div className="flex items-center mb-5 mobilescreen:mb-3.5 gap-2">
                        <img
                          className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                          src="/assets/voluneteerevent/urgent.svg"
                          alt=""
                        />
                        <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                          {t("COMMON.URGENT")}
                        </p>
                        <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                          {t("COMMON.YES")}
                        </p>
                      </div>
                    ) : null}

                    {/* Both flags set → urgent gets its own row underneath */}
                    {opportunityData?.is_relief && opportunityData?.is_urgent ? (
                      <div className="flex items-center mb-5 mobilescreen:mb-3.5 gap-2">
                        <img
                          className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                          src="/assets/voluneteerevent/urgent.svg"
                          alt=""
                        />
                        <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                          {t("COMMON.URGENT")}
                        </p>
                        <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                          {t("COMMON.YES")}
                        </p>
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* Emergency priority is independent of the "Outside
                        Kuwait" classification, so it gets its own row. */}
                    {opportunityData?.is_emergency && (
                      <div className="flex items-center mb-5 mobilescreen:mb-3.5 gap-2">
                        <span className="bg-[#D32F2F] text-white text-xs font-bold rounded-full px-3 py-1 leading-tight">
                          {t("COMMON.EMERGENCY_PRIORITY_BADGE")}
                        </span>
                        <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                          {t("COMMON.EMERGENCY_PRIORITY")}
                        </p>
                      </div>
                    )}

                    {/* Volunteering category, and the beneficiaries count that
                        only charity opportunities carry. */}
                    {opportunityData?.volunteer_category_display && (
                      <div className="flex items-center mb-5 mobilescreen:mb-3.5 gap-2">
                        <img
                          className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                          src="/assets/homepage/health.svg"
                          alt=""
                        />
                        <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                          {t("COMMON.VOLUNTEER_CATEGORY")}
                        </p>
                        <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                          {
                            opportunityData.volunteer_category_display[
                              selectedLanguage === "ar" ? "ar" : "en"
                            ]
                          }
                        </p>
                      </div>
                    )}

                    {opportunityData?.supports_beneficiaries_count &&
                      opportunityData?.beneficiaries_count != null && (
                        <div className="flex items-center mb-5 mobilescreen:mb-3.5 gap-2">
                          <img
                            className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                            src="/assets/homepage/person.svg"
                            alt=""
                          />
                          <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                            {t("COMMON.BENEFICIARIES_COUNT")}
                          </p>
                          <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                            {opportunityData.beneficiaries_count}
                          </p>
                        </div>
                      )}
                  </div>
                </div>

                <div className="hidden xss:block">
                  {showActionButton && (
                    <Button
                      variant="primary"
                      size="medium"
                      className="whitespace-nowrap mb-9 w-full !h-14 mt-6"
                      onClick={
                        isRepostState ? handleRepublishClick : handleRegisterClick
                      }
                    >
                      {actionButtonLabel}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="2xl:text-xl lg:text-base text-base font-bold text-primary-5 flex gap-2 items-center">
                    <img
                      src="/assets/voluneteerevent/rightarrows.svg"
                      alt=""
                      className={selectedLanguage === "ar" ? "rotate-rtl" : ""}
                    />
                    {t("COMMON.DESCRIPTION")}
                  </h3>
                </div>
                <div
                  className="2xl:text-lg lg:text-sm text-sm font-semibold text-secondary-102"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </div>

              {interestTags.length > 0 && (
                <div className="flex flex-wrap gap-6 mt-6 xss:gap-2 items-center">
                  <img src="/assets/voluneteerevent/label.svg" alt="" />
                  {interestTags.map((interest, index) => {
                    const label = interestLabel(interest, selectedLanguage);
                    return (
                      <span
                        key={interest.id ?? index}
                        style={{
                          backgroundColor:
                            TAG_BACKGROUNDS[index % TAG_BACKGROUNDS.length],
                        }}
                        className={`text-sm py-[13px] rounded-[20px] xss:py-2 xss:px-4 xss:text-xs px-8 ${TAG_TEXT_COLORS[index % TAG_TEXT_COLORS.length]
                          } cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() =>
                          router.push(
                            `/volunteer-opportunities-list?tags=${encodeURIComponent(
                              label
                            )}`
                          )
                        }
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Post-completion gallery: creators can add up to 10 images */}
              {((opportunityData?.opportunity_status === "completed" &&
                isCreator) ||
                afterCompletedImages.length > 0) && (
                  <div className="pt-[50px]">
                    {((opportunityData?.opportunity_status === "completed" &&
                      isCreator &&
                      afterCompletedImages.length < 10) ||
                      afterCompletedImages.length > 0) && (
                        <h3 className="2xl:text-xl lg:text-base text-base font-bold text-primary-5 mb-3 flex gap-2 items-center">
                          <div dir="rtl">
                            <img
                              src="/assets/voluneteerevent/rightarrows.svg"
                              alt=""
                              className={
                                selectedLanguage === "ar" ? "rotate-rtl" : ""
                              }
                            />
                          </div>
                          {t("COMMON.OPPORTUNITY_IMAGE")}
                        </h3>
                      )}

                    {opportunityData?.opportunity_status === "completed" &&
                      isCreator &&
                      afterCompletedImages.length < 10 && (
                        <div>
                          <UploadImageWithSave
                            label={t("COMMON.UPLOAD_IMAGE")}
                            instructions={[t("COMMON.MAX_FILE_SIZE")]}
                            multiple
                            accept="image/jpeg, image/png"
                            value={pendingFiles}
                            onChange={(files) => {
                              const remainingSlots =
                                10 - afterCompletedImages.length;
                              if (files.length > remainingSlots) {
                                toast.error(t("COMMON.MAX_FILES_EXCEEDED"));
                                return;
                              }
                              setPendingFiles(files);
                            }}
                            onRemove={(index) =>
                              setPendingFiles((previous) =>
                                previous.filter((_, i) => i !== index)
                              )
                            }
                            onSave={() => {
                              if (pendingFiles.length === 0) return;
                              handleFileUpload(pendingFiles);
                            }}
                          />
                        </div>
                      )}
                  </div>
                )}

              {afterCompletedImages.length > 0 && (
                <div className="relative mt-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                    {afterCompletedImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <a
                          href={image.image}
                          data-fancybox={`opportunity-gallery-${id}`}
                          className="block cursor-zoom-in"
                          title={t("COMMON.CLICK_TO_VIEW")}
                        >
                          <img
                            src={image.image}
                            alt="Completed opportunity"
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                        </a>
                        <div
                          className={`absolute top-2 right-2 ${isCreator ? "flex gap-2" : ""}`}
                        >
                          <button
                            type="button"
                            className="w-6 h-6 flex items-center justify-center rounded-full border border-blue-400 bg-white text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-blue-100"
                            onClick={() =>
                              handleDownloadImage(
                                image.id,
                                `opportunity_${opportunityData?.id}`
                              )
                            }
                            title={t("COMMON.DOWNLOAD_IMAGE")}
                          >
                            <FiDownload size={14} />
                          </button>
                          {isCreator && (
                            <button
                              type="button"
                              className="w-6 h-6 flex items-center justify-center rounded-full border border-red-400 bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-100"
                              onClick={() => openDeleteModal(image.id)}
                              title={t("COMMON.DELETE_IMAGE")}
                            >
                              <MdDelete size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border pt-[40px] 2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] lg:pt-[40px]">
        <SponsorsClient />
      </div>

      <Modal
        open={showDeleteOpportunity}
        onClose={() => setShowDeleteOpportunity(false)}
        title={t("COMMON.DELETE_OPPORTUNITY")}
        size="small"
      >
        <DeleteOpportunityModal
          opportunityId={id}
          type="volunteer"
          setOpenModal={() => setShowDeleteOpportunity(false)}
          refetch={() => {
            void refetch();
          }}
        />
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t("COMMON.DELETE_IMAGE")}
        size="sm"
      >
        <div className="text-center pb-6 text-lg">
          {t("COMMON.ARE_YOU_SURE_DELETE_IMAGE")}
        </div>
        <div className="flex justify-center w-full gap-5">
          <Button
            variant="primary"
            type="button"
            size="medium"
            onClick={handleConfirmDelete}
            disabled={deleteImageMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CONFIRM")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            type="button"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteImageMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={showCloseRegistration}
        onClose={() => setShowCloseRegistration(false)}
        title={t("COMMON.CLOSE_REGISTRATION")}
        size="sm"
      >
        <div className="text-center pb-6 text-lg">
          {t("COMMON.ARE_YOU_SURE_CLOSE_REGISTRATION")}
        </div>
        <div className="flex justify-center w-full gap-5">
          <Button
            variant="primary"
            type="button"
            size="medium"
            onClick={handleCloseRegistration}
            disabled={closeRegistrationMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CONFIRM")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            type="button"
            onClick={() => setShowCloseRegistration(false)}
            disabled={closeRegistrationMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={showReopenRegistration}
        onClose={() => setShowReopenRegistration(false)}
        title={t("COMMON.REOPEN_REGISTRATION")}
        size="sm"
      >
        <div className="text-center pb-6 text-lg">
          {t("COMMON.ARE_YOU_SURE_REOPEN_REGISTRATION")}
        </div>
        <div className="flex justify-center w-full gap-5">
          <Button
            variant="primary"
            type="button"
            size="medium"
            onClick={handleReopenRegistration}
            disabled={reopenRegistrationMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CONFIRM")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            type="button"
            onClick={() => setShowReopenRegistration(false)}
            disabled={reopenRegistrationMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={showResubmit}
        onClose={() => setShowResubmit(false)}
        title={t("COMMON.RESUBMIT_WITHOUT_EDIT")}
        size="sm"
      >
        <div className="text-center pb-6 text-lg">
          {t("COMMON.ARE_YOU_SURE_RESUBMIT")}
        </div>
        <div className="flex justify-center w-full gap-5">
          <Button
            variant="primary"
            type="button"
            size="medium"
            onClick={handleResubmit}
            disabled={resubmitMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CONFIRM")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            type="button"
            onClick={() => setShowResubmit(false)}
            disabled={resubmitMutation.isPending}
            className="xss:!w-full"
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
