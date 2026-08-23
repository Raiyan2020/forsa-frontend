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
import SponsorsClient from "@/features/home/components/SponsorsClient";
import {
  closeLearnServeOpportunityRegistration,
  deleteOpportunityImage,
  downloadOpportunityImage,
  getLearnServeOpportunityById,
  updateLearnServeOpportunityImages,
} from "@/features/services/api";
import {
  formatSingleDate,
  getDefaultProfileImage,
  openLocation,
} from "@/lib/helpers";
import { interestLabel, normalizeInterests } from "@/lib/interests";
import {
  NAV_STATE_KEYS,
  clearNavState,
  getNavState,
  setNavState,
} from "@/lib/navigationState";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import ConfirmRegistrationModal from "./ConfirmRegistrationModal";
import OpportunityFeedback from "./OpportunityFeedback";
import OpportunitySponsors from "./OpportunitySponsors";
import RegisterOnline from "./RegisterOnline";
import UnregisterLearnServeConfirmationModal from "./UnregisterLearnServeConfirmationModal";

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

export interface LearnServeOpportunityData {
  id: string | number;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  primary_language?: string;
  due_date?: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location_en?: string;
  location_ar?: string;
  location_url?: string | null;
  latitude?: number | string;
  longitude?: number | string;
  link?: string;
  from_age?: number;
  to_age?: number;
  participants_needed?: number;
  registered_volunteers_count?: number;
  opportunity_status?: string;
  is_creator?: boolean;
  is_registration_closed?: boolean;
  is_registration_open?: boolean;
  is_registered?: boolean;
  is_attended?: boolean;
  is_kuwaitis?: boolean;
  /**
   * `false` for workshops and consultations: their hours still count towards the
   * statistics, but nobody checks anyone in — the backend marks registrants
   * attended when the opportunity ends. Course, Class and Internship are the
   * types that do need a check-in.
   */
  requires_check_in?: boolean;
  manual_attendance_enabled?: boolean;
  preparation_valid_until?: string | null;
  preparation_valid_until_at?: string | null;
  is_preparation_window_closed?: boolean;
  preparation_reopened_until?: string | null;
  after_completed_images_count?: number;
  gender_display?: ChoiceDisplay;
  format_display?: ChoiceDisplay;
  learning_type_display?: ChoiceDisplay;
  certificate_type_display?: ChoiceDisplay;
  interest_display?: Array<{
    id: string | number;
    value_en: string;
    value_ar: string;
  }> | null;
  interests?: Array<{
    id: number | string;
    name_en: string;
    name_ar: string;
    interest_type?: string;
  }> | null;
  opportunity_images?: OpportunityImage[];
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

/** Courses and internships get their registrations on a different list screen. */
const CERTIFICATE_TYPES = ["Course", "Internship"];

export default function LearnServeDetails({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const user = useAuthStore((s) => s.user);
  const authToken = user?.auth_token;

  const id = opportunityId;

  const [open, setOpen] = useState(false);
  const [modalState, setModalState] = useState<1 | 2 | 3>(1);
  const [modalType, setModalType] = useState<"auth" | "consultation">("auth");
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showConfirmRegistrationModal, setShowConfirmRegistrationModal] =
    useState(false);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);
  const [isSubmitting] = useState(false);

  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpType, setOtpType] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState<{
    email: string;
    token: string;
  } | null>(null);
  const [showVolunteerMandateDetails, setShowVolunteerMandateDetails] =
    useState(false);
  const [mandateDetailsData, setMandateDetailsData] = useState<any>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showCloseRegistration, setShowCloseRegistration] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const opportunityQuery = useQuery({
    // The token is part of the key so logging in refetches with auth applied.
    queryKey: ["learn-serve-opportunity", id, Boolean(authToken)],
    queryFn: () => getLearnServeOpportunityById(id),
    enabled: Boolean(id),
  });

  const opportunityData = opportunityQuery.data?.data as
    | LearnServeOpportunityData
    | undefined;
  const refetch = opportunityQuery.refetch;

  const updateImagesMutation = useMutation({
    mutationFn: updateLearnServeOpportunityImages,
  });
  const deleteImageMutation = useMutation({ mutationFn: deleteOpportunityImage });
  const closeRegistrationMutation = useMutation({
    mutationFn: () => closeLearnServeOpportunityRegistration(id),
  });
  const downloadImageMutation = useMutation({
    mutationFn: downloadOpportunityImage,
  });

  const remainingParticipants = Math.max(
    0,
    (Number(opportunityData?.participants_needed) || 0) -
    (Number(opportunityData?.registered_volunteers_count) || 0)
  );

  useEffect(() => {
    const error = opportunityQuery.error as
      | { response?: { status?: number; data?: any } }
      | null;
    if (!error) return;

    if (error.response?.status === 404) {
      const errorData = error.response?.data;
      toast.error(
        (selectedLanguage === "ar"
          ? errorData?.message_ar
          : errorData?.message_en) ||
        t("COMMON.LEARN_SERVE_OPPORTUNITY_NOT_FOUND")
      );
      router.replace("/404");
      return;
    }

    console.error("Error fetching opportunity details:", error);
    toast.error(t("COMMON.ERROR_FETCHING_OPPORTUNITY"));
  }, [opportunityQuery.error, selectedLanguage, t, router]);

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
  // with the new user's profile stashed; pick it up once and clear it.
  useEffect(() => {
    const linkedinNewUserData = getNavState<any>(NAV_STATE_KEYS.linkedinNewUser);
    if (!linkedinNewUserData) return;
    clearNavState(NAV_STATE_KEYS.linkedinNewUser);
    setMandateDetailsData(linkedinNewUserData);
    setShowVolunteerMandateDetails(true);
  }, []);

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
      // Indices continue from the already-uploaded images
      const adjustedIndex = currentCount + index;
      formData.append(`new_opportunity_images_${adjustedIndex}`, file);
      formData.append(
        `new_opportunity_images_is_after_completed_${adjustedIndex}`,
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

  const handleShowEmailVerification = (email: string, type: string) => {
    setVerificationEmail(email);
    setOtpType(type);
    setShowEmailVerification(true);
  };

  const handleShowVolunteerMandateDetails = (userData: any) => {
    setMandateDetailsData(userData);
    setShowVolunteerMandateDetails(true);
  };

  const handleShowLogin = () => {
    setModalState(1);
    setModalType("auth");
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


  const handleRegisterClick = () => {
    if (opportunityData?.is_creator) {
      setNavState(NAV_STATE_KEYS.learnServeForm, { id });
      router.push("/learn-and-share-form");
      return;
    }

    if (!authToken) {
      setModalState(1);
      setModalType("auth");
      setOpen(true);
      return;
    }

    if (user?.is_banned === true && !opportunityData?.is_registered) {
      toast.error(t("COMMON.BANNED_USER_CANNOT_REGISTER"));
      return;
    }

    if (opportunityData?.is_registered) {
      setShowUnregisterModal(true);
      return;
    }

    // Consultation hours are booked against a specific slot; everything else
    // is a single yes/no confirmation.
    const isConsultationHours =
      opportunityData?.learning_type_display &&
      (opportunityData.learning_type_display.value_en?.toLowerCase() ===
        "consultationss" ||
        opportunityData.learning_type_display.value_ar === "استشارات");

    if (isConsultationHours) {
      setModalType("consultation");
      setShowConsultationModal(true);
    } else {
      setShowConfirmRegistrationModal(true);
    }
  };

  const handleRepublishClick = () => {
    setNavState(NAV_STATE_KEYS.learnServeForm, { id, isRepublish: true });
    router.push("/learn-and-share-form");
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

  const openDeleteModal = (imageId: number) => {
    setDeletingImageId(imageId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingImageId) return;
    try {
      await deleteImageMutation.mutateAsync({
        image_ids: [deletingImageId],
        type: "learnserve",
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

  const goToRegisteredList = () => {
    setNavState(NAV_STATE_KEYS.registerList, {
      id: opportunityData?.id,
      start_date: opportunityData?.start_date,
      end_date: opportunityData?.end_date,
      // Workshops and consultations report `requires_check_in: false` — the
      // backend counts their registrants as attended once the opportunity ends,
      // so the list must not offer an attendance control at all.
      requires_check_in: opportunityData?.requires_check_in,
      manual_attendance_enabled: opportunityData?.manual_attendance_enabled,
      preparation_valid_until: opportunityData?.preparation_valid_until,
      preparation_valid_until_at: opportunityData?.preparation_valid_until_at,
      is_preparation_window_closed:
        opportunityData?.is_preparation_window_closed,
      preparation_reopened_until: opportunityData?.preparation_reopened_until,
    });
    router.push(
      CERTIFICATE_TYPES.includes(
        opportunityData?.learning_type_display?.value_en || ""
      )
        ? "/leran-share-register-list"
        : "/learn-share-register-list"
    );
  };

  if (opportunityQuery.isLoading) {
    return <Loader />;
  }

  const isCreator = Boolean(opportunityData?.is_creator);
  const hasStarted = moment().isAfter(
    moment(opportunityData?.start_date).startOf("day")
  );
  const isRepostState =
    isCreator &&
    (opportunityData?.opportunity_status === "completed" ||
      opportunityData?.opportunity_status === "inprogress" ||
      hasStarted);

  /**
   * The due date is optional now: without one, registration stays open until
   * the opportunity's last day. The creator can also close it by hand, which
   * the backend reports as is_registration_closed / is_registration_open.
   */
  const closedByCreator =
    opportunityData?.is_registration_closed === true ||
    opportunityData?.is_registration_open === false;
  const registrationDeadline =
    opportunityData?.due_date || opportunityData?.end_date || null;
  const withinRegistrationWindow =
    !closedByCreator &&
    (!registrationDeadline ||
      moment.utc().isSameOrBefore(moment.utc(registrationDeadline), "day"));

  const showActionButton =
    (user ? user.is_verified === true : true) &&
    (isCreator ||
      (withinRegistrationWindow &&
        ((opportunityData?.is_registered &&
          opportunityData?.opportunity_status !== "completed") ||
          (user?.user_type !== "organization" &&
            !(
              !isCreator &&
              (moment().isAfter(
                moment(opportunityData?.start_date)
                  .subtract(1, "days")
                  .endOf("day")
              ) ||
                (opportunityData?.registered_volunteers_count ?? 0) >=
                (opportunityData?.participants_needed ?? 0))
            )))));

  // Only worth offering while the opportunity is still taking registrations.
  const canCloseRegistration =
    isCreator && !isRepostState && withinRegistrationWindow;

  const actionButtonLabel = isRepostState
    ? t("COMMON.REPOST")
    : isCreator
      ? t("COMMON.EDIT_TEXT")
      : opportunityData?.is_registered
        ? t("COMMON.UNREGISTER")
        : authToken
          ? t("COMMON.REGISTER")
          : t("COMMON.REGISTER_NOW");

  const organizerPath = !opportunityData?.created_by?.is_public
    ? `/volunteer-private-profile/${opportunityData?.created_by?.id}`
    : `/public-profile/${opportunityData?.created_by?.id}`;

  // The description is always shown in full — the View More toggle was removed.
  const description =
    (opportunityData?.primary_language === "ar"
      ? opportunityData?.description_ar
      : opportunityData?.description_en) || "";

  const format = opportunityData?.format_display?.value_en;
  const isInPerson = format === "IN PERSON";

  const opportunityDetails = {
    title_ar: opportunityData?.title_ar,
    title_en: opportunityData?.title_en,
    start_date: opportunityData?.start_date,
    isInPerson,
  };

  const actionButton = (mobile: boolean) => (
    <div
      className={
        mobile ? "flex flex-col" : "flex flex-col items-end gap-2"
      }
    >
      {showActionButton && (
        <Button
          variant="primary"
          size="medium"
          className={
            mobile
              ? "whitespace-nowrap my-6 w-full !h-14"
              : "whitespace-nowrap block xss:hidden"
          }
          onClick={isRepostState ? handleRepublishClick : handleRegisterClick}
        >
          {actionButtonLabel}
        </Button>
      )}

      {/* The creator can close registration before the due date */}
      {canCloseRegistration && (
        <Button
          variant="secondary"
          size="medium"
          className={
            mobile
              ? "whitespace-nowrap mb-6 w-full !h-14"
              : "whitespace-nowrap block xss:hidden"
          }
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
    </div>
  );

  return (
    <div className={`w-full ${selectedLanguage === "ar" ? "rlt" : "ltr"}`}>
      <Modal
        open={modalType === "auth" && open}
        onClose={() => setOpen(false)}
        disableFilterModalClass
        title={
          modalState === 1
            ? t("COMMON.JOINUS")
            : modalState === 2
              ? t("COMMON.SIGN.UP")
              : t("COMMON.ROLE")
        }
        size={modalState === 2 ? "md" : "sm"}
        footer={
          modalState === 3 ? (
            <div className="flex justify-center w-full gap-5">
              <Button
                variant="primary"
                size="medium"
                className="xss:!w-full"
                onClick={() => {
                  const form = document.querySelector("form") as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
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
        ) : null}
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

      <Modal
        open={modalType === "consultation" && showConsultationModal}
        onClose={() => setShowConsultationModal(false)}
        title={t("COMMON.CONFIRM_REGISTRATION")}
        size="md"
      >
        <RegisterOnline
          onClose={() => setShowConsultationModal(false)}
          opportunityId={String(opportunityData?.id)}
          opportunityDetails={opportunityDetails}
        />
      </Modal>

      <Modal
        open={showConfirmRegistrationModal}
        onClose={() => setShowConfirmRegistrationModal(false)}
        title={t("COMMON.CONFIRM_REGISTRATION")}
        size="sm"
      >
        <ConfirmRegistrationModal
          opportunityId={String(opportunityData?.id)}
          setOpenForm={() => setShowConfirmRegistrationModal(false)}
          refetch={refetch}
          opportunityDetails={opportunityDetails}
        />
      </Modal>

      <Modal
        open={showUnregisterModal}
        onClose={() => setShowUnregisterModal(false)}
        title={t("COMMON.CONFIRM_UNREGISTRATION")}
        size="sm"
      >
        <UnregisterLearnServeConfirmationModal
          opportunityId={id}
          onClose={() => setShowUnregisterModal(false)}
          refetch={refetch}
        />
      </Modal>

      <div className="relative w-full">
        <img
          className="w-full h-[320px] object-cover"
          src={opportunityData?.opportunity_images?.[0]?.image}
          alt=""
        />
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

                <div className="w-[100%] flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] bottom-[50px] lg:pt-[137px] md:pt-[80px] pt-[80px] lg:bottom-[100px] 2xl:px-[44px] lg:px-[20px] px-[20px] 2xl:pb-[70px] lg:pb-[40px] pb-[40px]">
                  <Link href={organizerPath}>
                    <div className="text-center shadow-[0px_4px_4px_0px_#00000040] bg-primary-5 rounded-[20px] text-white p-[24px] w-[252px]">
                      <h3 className="2xl:text-xl lg:text-base text-base font-bold text-white">
                        {opportunityData?.created_by?.full_name}
                      </h3>
                    </div>
                  </Link>

                  <div className="w-full pt-5 text-center">
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
                </div>
              </div>
            </div>

            <div
              className={`mobilescreen:bottom-[50px] sponseritm bg-[#DBDBDB] 2xl:bottom-[100px] lg:bottom-[100px] md:bottom-[60px] relative 2xl:p-[50px] lg:p-[30px] p-[30px] ${!opportunityData?.opportunity_sponsor_images?.length
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

            {isCreator && (
              <div className="w-[100%] flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] msscreen1:bottom-[70px] mdscreen:bottom-[75px] bottom-[50px] pt-[50px] lg:bottom-[100px] px-5 2xl:pb-[70px] lg:pb-[40px] pb-[40px]">
                <Button
                  variant="primary"
                  size="medium"
                  onClick={goToRegisteredList}
                  className="xs4:w-[125px] 2xl:!text-lg xss:w-auto laptop:!w-full text-sm px-1 font-bold text-primary-5 border-b border-primary-5 xsmall:text-xs !rounded-[20px] md:h-[60px]"
                >
                  <span className="xl:w-[140px] 2xl:w-[200px] lg:w-[95px] xsl:w-[150px] xss:w-[90px] smallscreen1:w-full smallscreen1:text-sm">
                    {t("COMMON.REGISTERED_LIST")}
                  </span>
                </Button>
              </div>
            )}
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
                </h2>
                {actionButton(false)}
              </div>

              <div className="flex items-center text-gray-600 text-sm pb-5 mobilescreen:pb-3.5">
                <p className="text-primary-5 2xl:text-xl lg:text-base text-base font-bold">
                  {t("COMMON.DUE_DATE")} :
                  <span className="text-secondary-102 font-bold">
                    {" "}
                    {formatSingleDate(
                      opportunityData?.due_date?.split("T")[0] || "",
                      selectedLanguage,
                      t
                    )}
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
                    {
                      opportunityData?.learning_type_display?.[
                      selectedLanguage === "ar" ? "value_ar" : "value_en"
                      ]
                    }
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
                  <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
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
                  <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                    {formatSingleDate(
                      opportunityData?.end_date || "",
                      selectedLanguage,
                      t
                    )}
                  </p>
                </div>
                <div className="flex items-center font-bold 2xl:text-xl lg:text-base text-base gap-2">
                  <img
                    className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                    src="/assets/homepage/timeicn.svg"
                    alt=""
                  />
                  <p className="font-bold text-secondary-102">
                    {moment(opportunityData?.start_time, "HH:mm:ss").format(
                      "hh:mm"
                    )}
                  </p>
                  <p className="text-primary-5 font-bold">
                    {moment(opportunityData?.start_time, "HH:mm:ss").format(
                      "a"
                    ) === "am"
                      ? t("COMMON.AM")
                      : t("COMMON.PM")}{" "}
                  </p>
                  <p className="text-secondary-102 font-bold">
                    -{" "}
                    {moment(opportunityData?.end_time, "HH:mm:ss").format("hh:mm")}
                  </p>
                  <p className="text-primary-5 font-bold">
                    {moment(opportunityData?.end_time, "HH:mm:ss").format("a") ===
                      "am"
                      ? t("COMMON.AM")
                      : t("COMMON.PM")}
                  </p>
                </div>
              </div>

              <div className="border-b mb-6">
                <div className="flex mt-5 mobilescreen:mt-3.5 xss:flex-col">
                  <div className="w-1/2 xss:w-full">
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
                  </div>

                  <div className="w-1/2 xss:w-full">
                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      <img
                        className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                        src={
                          isInPerson
                            ? "/assets/voluneteerevent/inperson.svg"
                            : "/assets/voluneteerevent/online.svg"
                        }
                        alt="Format Icon"
                      />
                      <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                        {opportunityData?.format_display
                          ? selectedLanguage === "ar"
                            ? opportunityData.format_display.value_ar
                            : opportunityData.format_display.value_en
                          : t("COMMON.ONLINE")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                      {isInPerson ? (
                        <>
                          <img
                            className={`${selectedLanguage === "ar"
                                ? "ml-3 right-[3px]"
                                : "mr-3 left-[3px]"
                              } w-5 h-5 object-contain relative`}
                            src="/assets/homepage/locations.svg"
                            alt=" Location Icon"
                          />
                          <div>
                            <p
                              className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold line-clamp-1 cursor-pointer hover:underline"
                              onClick={() =>
                                openLocation(
                                  opportunityData?.location_url,
                                  opportunityData?.latitude,
                                  opportunityData?.longitude
                                )
                              }
                              title={
                                (selectedLanguage === "ar"
                                  ? opportunityData?.location_ar
                                  : opportunityData?.location_en) ||
                                t("COMMON.ADDRESS_NOT_FOUND")
                              }
                            >
                              {(
                                (selectedLanguage === "ar"
                                  ? opportunityData?.location_ar
                                  : opportunityData?.location_en) || ""
                              )}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <img
                            className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                            src="/assets/voluneteerevent/onlinelink.svg"
                            alt=""
                          />
                          <div className="flex gap-3 items-center">
                            {/* The meeting link is only revealed to the organizer
                                and to registered participants. */}
                            {isCreator || opportunityData?.is_registered ? (
                              <a
                                href={opportunityData?.link || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold cursor-pointer hover:underline"
                              >
                                {t("COMMON.ONLINELINK")}
                              </a>
                            ) : (
                              <>
                                <p className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold">
                                  {t("COMMON.ONLINELINK")}
                                </p>
                                <div className="relative inline-block group">
                                  <img
                                    src="/assets/voluneteerevent/linkinfo.svg"
                                    alt=""
                                    className="cursor-pointer"
                                  />
                                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-[200px] z-50 p-3 xsl:w-[220px] xss:w-[150px] xsl:left-auto xsl:right-[100%] xss:left-[100%] xss:right-auto">
                                    {t("COMMON.LINK_AFTER_REGISTRATION")}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {CERTIFICATE_TYPES.includes(
                      opportunityData?.learning_type_display?.value_en || ""
                    ) && (
                        <div className="flex items-center gap-2 mb-5 mobilescreen:mb-3.5">
                          <img
                            className={`${selectedLanguage === "ar" ? "ml-3" : "mr-3"} w-5 h-5 object-contain`}
                            src="/assets/voluneteerevent/certificate.svg"
                            alt=""
                          />
                          <p className="2xl:text-xl lg:text-base text-base font-bold text-primary-5">
                            {opportunityData?.certificate_type_display
                              ? selectedLanguage === "ar"
                                ? opportunityData.certificate_type_display.value_ar
                                : opportunityData.certificate_type_display.value_en
                              : t("COMMON.CERTIFICATE_ATTENDANCE")}
                          </p>
                        </div>
                      )}

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
                  </div>

                  <div className="hidden xss:block">{actionButton(true)}</div>
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
                  className="2xl:text-lg lg:text-sm text-sm font-normal text-secondary-102"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </div>

              {interestTags.length > 0 && (
                <div className="flex flex-wrap gap-6 mt-6 xss:gap-2 items-center mb-6">
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
                        className={`text-sm py-[13px] xss:py-2 xss:px-4 xss:text-xs px-8 rounded-[20px] ${TAG_TEXT_COLORS[index % TAG_TEXT_COLORS.length]
                          } cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() =>
                          router.push(
                            `/learn-and-share-list?tags=${encodeURIComponent(
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
                  <div className="pt-[50px] pb-2">
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

            {opportunityData?.opportunity_status === "completed" &&
              opportunityData?.id && (
                <OpportunityFeedback
                  opportunityId={opportunityData.id}
                  isAttended={opportunityData.is_attended ?? false}
                />
              )}
          </div>
        </div>
      </div>

      <div className="border-t border pt-[40px] 2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] lg:pt-[40px]">
        <SponsorsClient />
      </div>

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
    </div>
  );
}
