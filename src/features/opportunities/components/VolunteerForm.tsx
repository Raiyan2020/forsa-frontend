"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Field,
  FieldArray,
  FieldProps,
  Form,
  Formik,
  FormikHelpers,
  FormikValues,
} from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FaMinus, FaPlus } from "react-icons/fa";
import * as Yup from "yup";

import Input from "@/components/ui/Input";
import SelectInput from "@/components/ui/SelectInput";
import CheckBox from "@/components/ui/CheckBox";
import DatePickerInput from "@/components/ui/DateField";
import TimepickerInput from "@/components/ui/TimePicker";
import AgeRange from "@/components/ui/AgeRange";
import RichTextEditor from "@/components/ui/RichTextEditor";
import UploadDocument from "@/components/ui/UploadDocument";
import { TagsCheckbox } from "@/components/ui/TagsCheckbox";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import Title from "@/components/shared/Title";
import { getDropdownChoicesRequest } from "@/features/auth/services/authApi";
import { checkLicenseRequirement, createVolunteerOpportunity, getOpportunityById, updateVolunteerOpportunity } from "@/features/opportunities/services/opportunities";
import { getAllOrganizations } from "@/features/shared/services/directory";
import { resubmitVolunteerOpportunity } from "@/features/opportunities/services/registrations";
import {
  VOLUNTEER_CATEGORY_WITH_BENEFICIARIES,
  opportunityPrivacyOptions,
  volunteerCategoryOptions,
} from "@/data/Constants";
import { getApiErrorMessages } from "@/lib/api/errors";
import i18n from "@/lib/i18n/config";
import {
  calculateHoursDifference,
  fetchAddress,
  fetchCoordinates,
  formatDateToYYYYMMDD,
} from "@/lib/helpers";
import { normalizeInterests, resolveInterestOptionIds } from "@/lib/interests";
import { NAV_STATE_KEYS, useConsumedNavState } from "@/lib/navigationState";
import { YupNumberOnly, YupRequiredString, YupStringMaxLength, YupWhatsAppLink } from "@/features/shared/schemas";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useRoleModalStore } from "@/store/roleModalStore";
import UpdateOpportunityConfirmModal from "./UpdateOpportunityConfirmModal";
import VolunteerRoleModal from "./VolunteerRoleModal";

/** Payload an opportunity card stashes before pushing to /volunteer-form. */
export interface VolunteerFormNavState {
  id?: string;
  isRepublish?: boolean;
}

interface VolunteerFormValues {
  license_image_removed: boolean;
  title_ar: string;
  title_en: string;
  dueDate: string;
  startDate: string;
  endDate: string;
  participantsNeeded: string;
  age: [number | null, number | null];
  startTime: string;
  endTime: string;
  volunteerHoursPerDay: string;
  gender: string;
  location: string;
  link: string;
  isPrivate?: string;
  description_ar: string;
  description_en: string;
  _interests: string[];
  opportunity_images: File[];
  license_image?: File | string;
  latitude: string;
  longitude: string;
  sponsors: { sponsorId: string; position: number }[];
  nationality: string;
  volunteerCategory: string;
  beneficiariesCount: string;
}

interface VolunteerFormProps {
  autoSetTimeOnClick?: boolean; // Auto-set time fields to 12:00 on first click
}

// Leaflet touches `window` at import time, so it can't be part of the SSR pass.
const LocationMapPicker = dynamic(
  () => import("@/components/ui/LocationMapPicker"),
  { ssr: false }
);

/**
 * Side effects that need Formik's bag. Kept out of the render prop so the hooks
 * aren't declared inside a callback.
 */
function VolunteerFormEffects({
  values,
  touched,
  validateForm,
  setFieldValue,
  opportunityData,
  id,
  selectedLanguage,
  skipNextGeocodeRef,
}: {
  values: VolunteerFormValues;
  touched: Record<string, unknown>;
  validateForm: () => Promise<unknown>;
  setFieldValue: (field: string, value: any) => void;
  opportunityData: any;
  id?: string;
  selectedLanguage: string;
  skipNextGeocodeRef: { current: boolean };
}) {
  // Sync location once opportunityData arrives (it loads after mount).
  // `map_desc` is a single language-agnostic field — no per-language lookup.
  useEffect(() => {
    if (!opportunityData || !id) return;
    if (opportunityData.map_desc) {
      skipNextGeocodeRef.current = true;
      setFieldValue("location", opportunityData.map_desc);
    }
    if (opportunityData.latitude) {
      setFieldValue("latitude", opportunityData.latitude.toString());
    }
    if (opportunityData.longitude) {
      setFieldValue("longitude", opportunityData.longitude.toString());
    }
  }, [opportunityData, setFieldValue, id, skipNextGeocodeRef]);

  // When editing with coordinates but no stored location text, reverse-geocode
  // them so the field isn't left empty.
  useEffect(() => {
    const getAddress = async () => {
      if (
        opportunityData?.latitude &&
        opportunityData?.longitude &&
        !opportunityData?.map_desc
      ) {
        const result = await fetchAddress(
          Number(opportunityData.latitude),
          Number(opportunityData.longitude),
          selectedLanguage
        );
        // Don't overwrite anything the user has typed
        if (!values.location) {
          skipNextGeocodeRef.current = true;
          setFieldValue("location", result);
        }
      }
    };

    if (id) void getAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    opportunityData?.latitude,
    opportunityData?.longitude,
    selectedLanguage,
    setFieldValue,
  ]);

  // Forward-geocode the typed address into coordinates so the map follows
  // what the user types, debounced so it doesn't fire on every keystroke.
  // Skipped once whenever `location` was just filled in programmatically
  // (map pick or the syncs above) — those already carry exact coordinates.
  useEffect(() => {
    if (skipNextGeocodeRef.current) {
      skipNextGeocodeRef.current = false;
      return;
    }
    const address = values.location?.trim();
    if (!address || address.length < 3) return;

    const timer = setTimeout(async () => {
      const result = await fetchCoordinates(address, selectedLanguage);
      if (result) {
        setFieldValue("latitude", result.lat.toString());
        setFieldValue("longitude", result.lng.toString());
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.location, selectedLanguage]);

  // Re-validate when a touched field gains a value
  useEffect(() => {
    const touchedFields = Object.keys(touched).filter(
      (fieldName) =>
        touched[fieldName] && !!values[fieldName as keyof VolunteerFormValues]
    );
    if (touchedFields.length > 0) {
      validateForm();
    }
  }, [values, touched, validateForm]);

  // Derive hours per day from the time range
  useEffect(() => {
    const hours = calculateHoursDifference(values.startTime, values.endTime);
    setFieldValue("volunteerHoursPerDay", hours);
  }, [values.startTime, values.endTime, setFieldValue]);

  return null;
}

export default function VolunteerForm({
  autoSetTimeOnClick = true,
}: VolunteerFormProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authToken = user?.auth_token;
  const isVolunteer = user?.user_type === "volunteer";
  // Set right before a map pick / a data sync fills `location` in
  // programmatically, so the forward-geocode effect skips that one change.
  const skipNextGeocodeRef = useRef(false);

  const formOpportunityId = useRoleModalStore((s) => s.opportunityId);
  const roleModalState = useRoleModalStore((s) => s.roleModalState);
  const openRoleModal = useRoleModalStore((s) => s.openRoleModal);
  const closeRoleModal = useRoleModalStore((s) => s.closeRoleModal);
  const setVolunteerOpportunityId = useRoleModalStore(
    (s) => s.setVolunteerOpportunityId
  );

  // Check if license is required for the logged-in user
  const { data: licenseRequirementData } = useQuery({
    queryKey: ["check-license-requirement"],
    queryFn: checkLicenseRequirement,
    enabled: Boolean(authToken),
  });
  const isLicenseRequired =
    licenseRequirementData?.data?.license_required ?? true;

  // Edit / repost target arrives via sessionStorage (React Router `location.state`).
  const navState = useConsumedNavState<VolunteerFormNavState>(
    NAV_STATE_KEYS.volunteerForm
  );
  const id = navState?.id;
  const isRepublish = navState?.isRepublish;

  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [roleModalRef, setRoleModalRef] = useState<{
    checkParticipantsMismatch: () => boolean;
  } | null>(null);

  const [formKey, setFormKey] = useState(0);
  const [showOpportunitySection] = useState(!isVolunteer);

  // Force Formik to remount when the language changes
  useEffect(() => {
    setFormKey((prevKey) => prevKey + 1);
  }, [selectedLanguage]);

  const {
    data: apiResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["opportunity-details", id],
    queryFn: () => getOpportunityById(id as string),
    enabled: Boolean(id),
  });

  const opportunityData = apiResponse?.data;

  // Refresh the form once opportunity data arrives
  useEffect(() => {
    if (opportunityData) {
      setFormKey((prevKey) => prevKey + 1);
    }
  }, [id, opportunityData]);

  useEffect(() => {
    if (id) refetch();
  }, [id, refetch]);

  const [selectedCheckBoxes, setSelectedCheckBoxes] = useState<string[]>([]);
  const [sponsorList, setSponsorList] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [preLoadedSponsors, setPreLoadedSponsors] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [sponsorIdsToFetch, setSponsorIdsToFetch] = useState<number[]>([]);
  const [open, setOpen] = useState(roleModalState);
  const [currentPage, setCurrentPage] = useState(1);
  const [opportunityId, setOpportunityId] = useState<string | null>(
    formOpportunityId
  );
  const [modifiedOpportunityImages, setModifiedOpportunityImages] = useState<
    Array<{ id: number; image: string }>
  >([]);
  const [modifiedLicenseImage, setModifiedLicenseImage] = useState<
    Array<{ id: number; image: string }>
  >([]);
  const [existingImageIds, setExistingImageIds] = useState<number[]>([]);

  const createOpportunityMutation = useMutation({
    mutationFn: createVolunteerOpportunity,
  });
  const updateOpportunityMutation = useMutation({
    mutationFn: updateVolunteerOpportunity,
  });
  const submitLoading = createOpportunityMutation.isPending;
  const updateLoading = updateOpportunityMutation.isPending;

  useEffect(() => {
    if (formOpportunityId != null) {
      setOpportunityId(formOpportunityId);
    }
  }, [formOpportunityId]);

  useEffect(() => {
    setOpen(roleModalState);
  }, [roleModalState]);

  // Mirror the loaded opportunity into local image / checkbox / sponsor state
  useEffect(() => {
    if (!opportunityData) return;

    // Only images captured before completion belong to the editable set
    const oppImages =
      opportunityData.opportunity_images
        ?.filter((img: any) => img.is_after_completed === false)
        .map((img: any) => ({ id: img.id, image: img.image })) || [];

    setModifiedOpportunityImages(oppImages);
    setModifiedLicenseImage(
      opportunityData.license_image
        ? [{ id: 0, image: opportunityData.license_image }]
        : []
    );

    setSelectedCheckBoxes([
      ...(opportunityData.is_relief ? ["relief"] : []),
      ...(opportunityData.is_kuwaitis ? ["interview"] : []),
      ...(opportunityData.is_urgent ? ["urgent"] : []),
      ...(opportunityData.is_emergency ? ["emergency"] : []),
      ...(opportunityData.is_supports_disabled ? ["disabled"] : []),
    ]);

    setExistingImageIds(oppImages.map((img: { id: number }) => img.id));

    // Pre-selected sponsors: the backend returns either nested objects or IDs
    if (opportunityData.opportunity_sponsor_images?.length > 0) {
      const sponsorData = opportunityData.opportunity_sponsor_images.map(
        (item: any) => item.organization
      );

      const hasNestedObjects =
        sponsorData.length > 0 &&
        typeof sponsorData[0] === "object" &&
        sponsorData[0] !== null &&
        "full_name" in sponsorData[0];

      if (hasNestedObjects) {
        setPreLoadedSponsors(
          sponsorData.map((org: any) => ({
            id: String(org.id),
            full_name: org.full_name || org.company_name || "",
          }))
        );
      } else {
        setSponsorIdsToFetch(sponsorData.filter((v: any) => v != null));
      }
    }
  }, [opportunityData]);

  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ["volunteer-opportunity-interest-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("volunteer_opportunity_interest"),
    enabled: !!selectedLanguage,
  });

  const tagOptions: Array<{ id: string; label: string }> =
    tagsData?.data?.map((item: any) => ({
      id: String(item.id),
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
    })) || [];

  const handleCheckboxChange = (value: string, checked: boolean) => {
    setSelectedCheckBoxes((prev) =>
      checked ? [...prev, value] : prev.filter((item) => item !== value)
    );
  };

  const { data: genderData, isLoading: genderLoading } = useQuery({
    queryKey: ["opportunity-gender-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("opportunity_gender"),
    enabled: !!selectedLanguage,
  });

  const {
    data: sponsorsData,
    isLoading: sponsorsLoading,
    isFetching: sponsorsFetching,
  } = useQuery({
    queryKey: ["all-organizations", currentPage],
    queryFn: () => getAllOrganizations({ name: "", page: currentPage, limit: 10 }),
    enabled: Boolean(authToken),
  });

  const handleMenuScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (
      target.scrollHeight - target.scrollTop === target.clientHeight &&
      !sponsorsLoading &&
      sponsorsData?.meta?.pagination?.page <
        sponsorsData?.meta?.pagination?.total_pages
    ) {
      setCurrentPage((prev) => prev + 1); // Only fetch when more pages exist
    }
  };

  // Fetch pre-selected sponsors by ID when the detail payload gave us bare IDs
  const { data: sponsorsByIdsData } = useQuery({
    queryKey: ["organizations-by-ids", sponsorIdsToFetch],
    queryFn: () =>
      getAllOrganizations({
        ids: sponsorIdsToFetch.join(","),
        page: 1,
        limit: 100,
      }),
    enabled: Boolean(authToken) && sponsorIdsToFetch.length > 0,
  });

  // Seed sponsorList with the pre-loaded (nested object) sponsors
  useEffect(() => {
    if (preLoadedSponsors.length === 0) return;
    setSponsorList((prev) => {
      const newSponsors = preLoadedSponsors.filter(
        (preLoaded) => !prev.some((existing) => existing.id === preLoaded.id)
      );
      return [...newSponsors, ...prev];
    });
  }, [preLoadedSponsors]);

  // Load sponsors fetched by ID
  useEffect(() => {
    if (!sponsorsByIdsData?.data) return;
    setSponsorList((prev) => {
      const fetchedSponsors = sponsorsByIdsData.data.map(
        (s: { id: number; full_name: string }) => ({
          id: String(s.id),
          full_name: s.full_name,
        })
      );
      const newSponsors = fetchedSponsors.filter(
        (fetched: { id: string }) =>
          !prev.some((existing) => existing.id === fetched.id)
      );
      return [...newSponsors, ...prev];
    });
  }, [sponsorsByIdsData]);

  // Accumulate paginated sponsors, skipping duplicates
  useEffect(() => {
    if (!sponsorsData?.data) return;
    setSponsorList((prev) => {
      const newSponsors = sponsorsData.data.filter(
        (newSponsor: { id: number }) =>
          !prev.some((existing) => existing.id === String(newSponsor.id))
      );
      return [
        ...prev,
        ...newSponsors.map((s: { id: number; full_name: string }) => ({
          id: String(s.id),
          full_name: s.full_name,
        })),
      ];
    });
  }, [sponsorsData]);

  // Pre-loaded sponsors must stay visible in edit/repost mode even before the
  // paginated list reaches them.
  const sponsorOptions = useMemo(() => {
    const sponsorMap = new Map<string, { label: string; value: string }>();

    preLoadedSponsors.forEach((sponsor) => {
      sponsorMap.set(sponsor.id, {
        label: sponsor.full_name,
        value: sponsor.id,
      });
    });

    sponsorList.forEach((sponsor) => {
      if (!sponsorMap.has(sponsor.id)) {
        sponsorMap.set(sponsor.id, {
          label: sponsor.full_name,
          value: sponsor.id,
        });
      }
    });

    return Array.from(sponsorMap.values());
  }, [preLoadedSponsors, sponsorList]);

  const genderOptions =
    genderData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  const initialValues: VolunteerFormValues = {
    title_ar: opportunityData?.title_ar || "",
    title_en: opportunityData?.title_en || "",
    dueDate: opportunityData?.due_date || "",
    startDate: opportunityData?.start_date || "",
    endDate: opportunityData?.end_date || "",
    participantsNeeded: opportunityData?.participants_needed?.toString() || "",
    age: [
      opportunityData?.from_age ? Number(opportunityData.from_age) : null,
      opportunityData?.to_age ? Number(opportunityData.to_age) : null,
    ],
    startTime:
      opportunityData?.start_time?.split(":")?.slice(0, 2).join(":") || "",
    endTime: opportunityData?.end_time?.split(":")?.slice(0, 2).join(":") || "",
    volunteerHoursPerDay:
      opportunityData?.volunteer_hours_per_day?.toString() || "",
    gender: opportunityData?.gender_display?.id || "",
    location: opportunityData?.map_desc || "",
    link: opportunityData?.link || "",
    description_ar: opportunityData?.description_ar || "",
    description_en: opportunityData?.description_en || "",
    _interests: resolveInterestOptionIds(
      normalizeInterests(
        opportunityData?.interest_display,
        opportunityData?.interests
      ),
      tagOptions
    ),
    opportunity_images: [],
    license_image: "",
    isPrivate: id
      ? opportunityData?.is_public === false
        ? "private"
        : "public"
      : "",
    latitude: opportunityData?.latitude?.toString() || "",
    longitude: opportunityData?.longitude?.toString() || "",
    sponsors: opportunityData?.opportunity_sponsor_images?.length
      ? opportunityData.opportunity_sponsor_images.map(
          (sponsor: any, index: number) => ({
            sponsorId:
              typeof sponsor.organization === "object" &&
              sponsor.organization !== null
                ? String(sponsor.organization.id)
                : String(sponsor.organization ?? ""),
            position: index + 1,
          })
        )
      : [{ sponsorId: "", position: 1 }],
    license_image_removed: false,
    nationality:
      opportunityData?.opportunity_nationality === "kuwaitis"
        ? "kuwaitis"
        : "all",
    volunteerCategory: opportunityData?.volunteer_category || "",
    beneficiariesCount:
      opportunityData?.beneficiaries_count != null
        ? String(opportunityData.beneficiaries_count)
        : "",
  };

  const notInPast = (value?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    return !value || new Date(value) >= today;
  };

  // Shared by both the Arabic and English description fields.
  const descriptionSchema = Yup.string()
    .concat(YupRequiredString)
    .test(
      "is-not-empty-html",
      i18n.t("COMMON.REQUIRED.FIELD"),
      function (value) {
        if (!value) return false;
        // Strip markup and entities — an empty <p></p> is not real content
        const textContent = value
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim();
        return textContent.length > 0;
      }
    )
    .test(
      "description-min-length",
      i18n.t("COMMON.DESCRIPTION_MIN_LENGTH"),
      function (value) {
        if (!value) return true; // emptiness is the required rule's business
        // Count visible text, not raw HTML — tags and entities are not content
        const textContent = value
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim();
        return textContent.length >= 10;
      }
    );

  const validationSchema = Yup.object({
    title_ar: YupStringMaxLength(400)
      .min(2, () => i18n.t("COMMON.EVENT_TITLE_MIN_LENGTH"))
      .concat(YupRequiredString),
    title_en: YupStringMaxLength(400)
      .min(2, () => i18n.t("COMMON.EVENT_TITLE_MIN_LENGTH"))
      .concat(YupRequiredString),
    dueDate: Yup.string()
      .concat(YupRequiredString)
      .test("due-date-in-future", i18n.t("COMMON.DATE_MUST_BE_FUTURE"), notInPast)
      .test(
        "due-date-before-start-date",
        i18n.t("COMMON.DUE_DATE_BEFORE_START"),
        function (value) {
          const startDate = this.parent.startDate;
          return !value || !startDate || new Date(value) < new Date(startDate);
        }
      ),
    startDate: Yup.string()
      .concat(YupRequiredString)
      .test("start-date-in-future", i18n.t("COMMON.DATE_MUST_BE_FUTURE"), notInPast),
    endDate: Yup.string()
      .concat(YupRequiredString)
      .test("end-date-in-future", i18n.t("COMMON.DATE_MUST_BE_FUTURE"), notInPast)
      .test(
        "end-date-after-start-date",
        i18n.t("COMMON.END_DATE_AFTER_START"),
        function (value) {
          const startDate = this.parent.startDate;
          if (!startDate || !value) return true;
          // Compare calendar days only, ignoring any time component
          const normalizeDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate()
            );
          };
          return normalizeDate(value) >= normalizeDate(startDate);
        }
      ),
    participantsNeeded: YupNumberOnly,
    volunteerCategory: Yup.string().concat(YupRequiredString),
    // Only charity opportunities carry a beneficiaries count; the backend nulls
    // it for the other categories, so it is never required.
    beneficiariesCount: Yup.string().test(
      "beneficiaries-count-is-number",
      i18n.t("COMMON.ONLY_NUMBERS"),
      (value) => !value || /^\d+$/.test(value)
    ),
    age: Yup.array()
      .of(Yup.number().nullable())
      .test(
        "start-age-required",
        i18n.t("COMMON.REQUIRED.FIELD"),
        (value) => Array.isArray(value) && value.length > 0 && value[0] !== null
      )
      .test(
        "valid-age-range",
        "End age must be greater than or equal to start age",
        (value) => {
          if (!Array.isArray(value) || value.length < 2) return true;
          const [start, end] = value as Array<number | null>;
          if (end === null) return true;
          if (start !== null && end !== null) return start <= end;
          return true;
        }
      ),
    startTime: Yup.string().concat(YupRequiredString),
    endTime: Yup.string()
      .concat(YupRequiredString)
      .test(
        "end-time-after-start-time",
        i18n.t("COMMON.END_TIME_AFTER_START"),
        function (value) {
          const startTime = this.parent.startTime;
          if (!startTime || !value) return true;
          const [startHour, startMinute] = startTime.split(":").map(Number);
          const [endHour, endMinute] = value.split(":").map(Number);
          return endHour * 60 + endMinute > startHour * 60 + startMinute;
        }
      ),
    gender: Yup.string().concat(YupRequiredString),
    location: YupRequiredString.test(
      "has-coordinates",
      t("COMMON.INVALID_ADDRESS"),
      function (value) {
        const { latitude, longitude } = this.parent;
        return (!!value && latitude !== undefined) || longitude !== undefined;
      }
    ),
    link: YupWhatsAppLink.concat(YupRequiredString),
    description_ar: descriptionSchema,
    description_en: descriptionSchema,
    _interests: Yup.array()
      .of(Yup.string())
      .min(1, i18n.t("COMMON.REQUIRED.FIELD")),
    opportunity_images: Yup.mixed().test(
      "has-files",
      i18n.t("COMMON.REQUIRED.FIELD"),
      function (value) {
        return (
          (Array.isArray(value) && value.length > 0) ||
          modifiedOpportunityImages.length > 0
        );
      }
    ),
    license_image: Yup.mixed().test(
      "license-image-required",
      i18n.t("COMMON.REQUIRED.FIELD"),
      function (value) {
        if (!isLicenseRequired) return true;

        // Editing: an untouched existing image satisfies the requirement
        if (id && this.parent.license_image_removed === false) {
          if (modifiedLicenseImage.length > 0) return true;
          return value instanceof File && value.size > 0;
        }
        return value instanceof File && value.size > 0;
      }
    ),
  });

  const handleSubmit = async (
    values: VolunteerFormValues,
    { resetForm }: FormikHelpers<VolunteerFormValues>
  ) => {
    try {
      const checkboxValues = {
        is_relief: selectedCheckBoxes.includes("relief"),
        is_kuwaitis: selectedCheckBoxes.includes("interview"),
        is_urgent: selectedCheckBoxes.includes("urgent"),
        // Emergency priority is independent of the "Outside Kuwait"
        // (`is_relief`) classification — it only drives the badge and the
        // top-of-list ordering the API applies.
        is_emergency: selectedCheckBoxes.includes("emergency"),
        is_supports_disabled: selectedCheckBoxes.includes("disabled"),
      };

      const formData = new FormData();

      formData.append("title_ar", values.title_ar);
      formData.append("title_en", values.title_en);
      formData.append("description_ar", values.description_ar);
      formData.append("description_en", values.description_en);
      formData.append("due_date", values.dueDate);
      formData.append("start_date", formatDateToYYYYMMDD(values.startDate));
      formData.append("end_date", formatDateToYYYYMMDD(values.endDate));
      formData.append("participants_needed", values.participantsNeeded);
      formData.append(
        "from_age",
        values.age[0] !== null ? values.age[0].toString() : ""
      );
      formData.append(
        "to_age",
        values.age[1] !== null ? values.age[1].toString() : ""
      );
      formData.append("start_time", values.startTime);
      formData.append("end_time", values.endTime);
      formData.append("latitude", values.latitude);
      formData.append("longitude", values.longitude);
      formData.append("link", values.link);
      formData.append("primary_language", selectedLanguage);
      formData.append("volunteer_hours_per_day", values.volunteerHoursPerDay);
      formData.append("gender", values.gender);
      formData.append(
        "is_public",
        showOpportunitySection
          ? values.isPrivate === "public"
            ? "1"
            : "0"
          : "1"
      );
      formData.append(
        "opportunity_nationality",
        values.nationality === "all" ? "all" : "kuwaitis"
      );
      formData.append("map_desc", values.location);
      // No longer collected from the user — the map picker's lat/lng replaced
      // it, so every save clears out whatever an older record had stored.
      formData.append("location_url", "");
      formData.append("volunteer_category", values.volunteerCategory);
      // Beneficiaries only exist for charity work — send the field only then, so
      // a category switch doesn't push a stale count the backend would null out.
      if (
        values.volunteerCategory === VOLUNTEER_CATEGORY_WITH_BENEFICIARIES &&
        values.beneficiariesCount
      ) {
        formData.append("beneficiaries_count", values.beneficiariesCount);
      }

      Object.entries(checkboxValues).forEach(([key, value]) => {
        // The API's `boolean` validation rule only accepts 1/0 (or "1"/"0"),
        // not the literal strings "true"/"false".
        formData.append(key, value ? "1" : "0");
      });

      values._interests.forEach((interest) => {
        formData.append("_interests", interest);
      });

      if (isRepublish && id && !(values.license_image instanceof File)) {
        formData.append("opportunity_id", id);
      }

      // Only send existing_image_ids for images with is_after_completed === false
      if (id && existingImageIds.length > 0) {
        existingImageIds.forEach((imageId) => {
          formData.append("existing_image_ids", imageId.toString());
        });
      }

      values.opportunity_images.forEach((file, index) => {
        if (file instanceof File) {
          formData.append(`new_opportunity_images_${index}`, file);
          formData.append(
            `new_opportunity_images_is_after_completed_${index}`,
            "0"
          );
        }
      });

      // License image: send a new file, or signal removal, or leave untouched
      if (values.license_image instanceof File && values.license_image.size > 0) {
        formData.append("license_image", values.license_image);
      } else if (id && !isRepublish && values.license_image_removed) {
        formData.append("license_image_removed", "1");
      }

      values.sponsors.forEach((sponsor, index) => {
        const idKey = index + 1;
        if (sponsor.sponsorId) {
          formData.append(
            `opportunity_sponsor_images_organization_${idKey}`,
            sponsor.sponsorId
          );
          formData.append(
            `opportunity_sponsor_images_position_${idKey}`,
            String(idKey)
          );
        }
      });

      if (id && !isRepublish) {
        // Show confirmation modal for update
        setPendingFormData(formData);
        setShowUpdateConfirmModal(true);
      } else {
        // Create new opportunity, then open the role editor for it
        const response = await createOpportunityMutation.mutateAsync(formData);
        const responseOpportunityId = response?.data?.id;
        if (responseOpportunityId != null) {
          setVolunteerOpportunityId(String(responseOpportunityId));
          toast.success(t("COMMON.TOAST.CREATE_OPPORTUNITY_SUCCESS"));
          openRoleModal();
        }
      }

      resetForm();
      setSelectedCheckBoxes([]);
    } catch (err) {
      const messages = getApiErrorMessages(err, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.CREATE_OPPORTUNITY_FAILED"));
      }
    }
  };

  const handleUpdateConfirm = async () => {
    if (!pendingFormData || !id) return;

    try {
      await updateOpportunityMutation.mutateAsync({
        id,
        data: pendingFormData,
      });

      // A rejected opportunity stays rejected until explicitly resubmitted —
      // editing it alone doesn't move it back into the review queue.
      if (opportunityData?.approval_status === "rejected") {
        try {
          await resubmitVolunteerOpportunity(id);
          toast.success(t("COMMON.TOAST.RESUBMIT_SUCCESS"));
        } catch {
          toast.error(t("COMMON.TOAST.RESUBMIT_FAILED"));
        }
      } else {
        toast.success(t("COMMON.TOAST.UPDATE_OPPORTUNITY_SUCCESS"));
      }

      router.push(`/volunteer-event-detail/${id}`);
      setPendingFormData(null);
    } catch (err) {
      const messages = getApiErrorMessages(err, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.UPDATE_OPPORTUNITY_FAILED"));
      }
      throw err;
    }
  };

  const handleRemoveExistingFile = (
    index: number,
    isExistingFile: boolean,
    fieldName: string,
    setFieldValue: (field: string, value: any) => void,
    values: FormikValues
  ) => {
    if (isExistingFile) {
      if (fieldName === "opportunity_images") {
        const removedImageId = modifiedOpportunityImages[index]?.id;
        setModifiedOpportunityImages((prev) =>
          prev.filter((_, i) => i !== index)
        );
        setExistingImageIds((prev) =>
          prev.filter((imageId) => imageId !== removedImageId)
        );
        // Keep only the newly uploaded files in the Formik value (no URLs)
        const currentFiles = Array.isArray(values[fieldName])
          ? values[fieldName]
          : [];
        setFieldValue(
          fieldName,
          currentFiles.filter((file: any) => file instanceof File)
        );
      } else if (fieldName === "license_image") {
        setModifiedLicenseImage([]);
        setFieldValue("license_image", "");
        // Tell the backend to drop the stored image
        setFieldValue("license_image_removed", true);
      }
    } else if (fieldName === "license_image") {
      setFieldValue("license_image", "");
    } else if (fieldName === "opportunity_images") {
      const currentFiles = Array.isArray(values[fieldName])
        ? [...values[fieldName]]
        : [];
      currentFiles.splice(index, 1);
      setFieldValue(fieldName, currentFiles);
    }
  };

  // Scroll to the first field with an error
  const scrollToError = (errors: any) => {
    if (!errors) return;
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return;

    // Fields whose inputs don't carry a matching name attribute
    const specialFieldSelectors: Record<string, string> = {
      description_ar: ".descritpionitm-ar", // rich text editor
      description_en: ".descritpionitm-en",
      _interests: ".TagsCheckbox",
      opportunity_images: ".uploaddocfiles",
      license_image: "input[type=file]",
    };

    for (const fieldName of errorFields) {
      let element: Element | null = document.querySelector(
        `[name="${fieldName}"]`
      );
      if (!element && specialFieldSelectors[fieldName]) {
        element = document.querySelector(specialFieldSelectors[fieldName]);
      }
      if (!element) {
        element = document.getElementById(fieldName);
      }
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    document
      .querySelector("form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRoleModalClose = () => {
    if (roleModalRef?.checkParticipantsMismatch()) {
      setShowMismatchModal(true);
      return;
    }
    closeRoleModal();
    router.push("/posting-thankyou");
  };

  // `navState === null` means the stashed payload has not been read yet.
  if (navState === null || isLoading) {
    return <Loader />;
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleRoleModalClose}
        title={t("COMMON.ROLE")}
        size="md"
      >
        <VolunteerRoleModal
          opportunityId={opportunityId ?? "0"}
          setMismatchChecker={(ref) => setRoleModalRef(ref)}
          showMismatchModal={showMismatchModal}
          setShowMismatchModal={setShowMismatchModal}
          onclose={() => {
            closeRoleModal();
            router.push("/posting-thankyou");
          }}
        />
      </Modal>

      <Modal
        open={showUpdateConfirmModal}
        onClose={() => setShowUpdateConfirmModal(false)}
        title={t("COMMON.UPDATE_OPPORTUNITY")}
        size="sm"
      >
        <UpdateOpportunityConfirmModal
          setOpenModal={() => setShowUpdateConfirmModal(false)}
          onConfirm={handleUpdateConfirm}
          opportunityTitle={
            opportunityData && {
              title_en: opportunityData.title_en,
              title_ar: opportunityData.title_ar,
            }
          }
        />
      </Modal>

      <div className="border-t border-[#000]">
        <div className="2xl:w-[1225px] lg:w-[1050px] md:w-[96%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] mx-auto">
          <h2>
            <Title text={t("COMMON.VOLUNTEER_FORM")} variant="default" />
          </h2>
          <Formik
            key={formKey}
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
            validateOnMount={false}
            validateOnBlur
            validateOnChange
          >
            {({
              setFieldValue,
              values,
              setFieldTouched,
              errors,
              touched,
              isSubmitting,
              submitForm,
              validateForm,
              setTouched,
            }) => {
              // Mark everything touched, validate, then submit or scroll to the error
              const handleFormSubmit = async () => {
                const touchedFields = Object.keys(values).reduce(
                  (acc, field) => {
                    acc[field] = true;
                    return acc;
                  },
                  {} as Record<string, boolean>
                );
                setTouched(touchedFields);

                const validationErrors = await validateForm();
                if (Object.keys(validationErrors).length > 0) {
                  scrollToError(validationErrors);
                  return;
                }
                submitForm();
              };

              return (
                <Form className="selectfiled">
                  <VolunteerFormEffects
                    values={values}
                    touched={touched as Record<string, unknown>}
                    validateForm={validateForm}
                    setFieldValue={setFieldValue}
                    opportunityData={opportunityData}
                    id={id}
                    selectedLanguage={selectedLanguage}
                    skipNextGeocodeRef={skipNextGeocodeRef}
                  />

                  <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col miniscreen:flex-col miniscreen:gap-0">
                    <Input
                      name="title_ar"
                      label={t("COMMON.ENTER_TITLE_AR")}
                      type="text"
                      maxLength={400}
                      dir="rtl"
                      onFocus={() => setFieldTouched("title_ar", true)}
                    />
                    <Input
                      name="title_en"
                      label={t("COMMON.ENTER_TITLE_EN")}
                      type="text"
                      maxLength={400}
                      dir="ltr"
                      onFocus={() => setFieldTouched("title_en", true)}
                    />

                    <div className="flex w-full xss:flex-col gap-6 xss:gap-0">
                      {showOpportunitySection && (
                        <SelectInput
                          name="isPrivate"
                          label={t("COMMON.OPPORTUNITY.SHOULD.BE")}
                          options={opportunityPrivacyOptions.map((option) => ({
                            value: option.value,
                            label:
                              selectedLanguage === "ar"
                                ? option.name_ar
                                : option.name_en,
                          }))}
                          placeholder={t("COMMON.SELECT")}
                        />
                      )}
                      <DatePickerInput
                        name="dueDate"
                        label={t("COMMON.DUE_DATE")}
                        rmdpClassname="placeholder-primary-5"
                        minDate={new Date()}
                        showDueDate
                      />
                    </div>
                  </div>

                  <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col xss:pt-0 miniscreen:flex-col miniscreen:gap-0">
                    <DatePickerInput
                      name="startDate"
                      label={t("COMMON.START_DATE")}
                      rmdpClassname="placeholder-primary-5"
                      minDate={new Date()}
                    />
                    <DatePickerInput
                      name="endDate"
                      label={t("COMMON.END_DATE")}
                      rmdpClassname="placeholder-primary-5"
                      minDate={new Date()}
                    />
                    <Field name="startTime">
                      {({ field }: FieldProps<string, VolunteerFormValues>) => (
                        <TimepickerInput
                          label={t("COMMON.START_TIME")}
                          className="w-full"
                          autoSetTime={autoSetTimeOnClick}
                          {...field}
                        />
                      )}
                    </Field>
                    <Field name="endTime">
                      {({ field }: FieldProps<string, VolunteerFormValues>) => (
                        <TimepickerInput
                          label={t("COMMON.END_TIME")}
                          className="w-full"
                          autoSetTime={autoSetTimeOnClick}
                          {...field}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col">
                    <AgeRange name="age" label={t("COMMON.AGE")} />

                    <Input
                      name="participantsNeeded"
                      label={t("COMMON.PARTICIPANTS_NEEDED")}
                      type="text"
                      onFocus={() => setFieldTouched("participantsNeeded", true)}
                    />

                    <SelectInput
                      name="gender"
                      label={t("COMMON.GENDER")}
                      options={genderOptions}
                      onChange={(selectedOption) =>
                        setFieldValue("gender", selectedOption?.value || "")
                      }
                      disabled={genderLoading}
                    />
                    <Input
                      name="link"
                      label={t("COMMON.WHATSAPP_LINK")}
                      className="w-full"
                      onFocus={() => setFieldTouched("link", true)}
                    />
                  </div>

                  <Input
                    name="location"
                    label={t("COMMON.LOCATION")}
                    onFocus={() => setFieldTouched("location", true)}
                  />
                  <LocationMapPicker
                    latitude={values.latitude}
                    longitude={values.longitude}
                    onPick={async (lat, lng) => {
                      setFieldValue("latitude", lat);
                      setFieldValue("longitude", lng);
                      setFieldTouched("location", true);
                      if (!values.location) {
                        const address = await fetchAddress(
                          Number(lat),
                          Number(lng),
                          selectedLanguage
                        );
                        skipNextGeocodeRef.current = true;
                        setFieldValue("location", address);
                      }
                    }}
                  />

                  <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col">
                    <div className="w-full md:w-1/2">
                      <SelectInput
                        name="volunteerCategory"
                        label={t("COMMON.VOLUNTEER_CATEGORY")}
                        placeholder={t("COMMON.SELECT")}
                        options={volunteerCategoryOptions.map((option) => ({
                          value: option.value,
                          label:
                            selectedLanguage === "ar"
                              ? option.name_ar
                              : option.name_en,
                        }))}
                        onChange={(selectedOption) => {
                          const next = selectedOption?.value || "";
                          setFieldValue("volunteerCategory", next);
                          // Leaving charity drops the count the backend would
                          // null anyway, so the hidden field can't go stale.
                          if (next !== VOLUNTEER_CATEGORY_WITH_BENEFICIARIES) {
                            setFieldValue("beneficiariesCount", "");
                          }
                        }}
                      />
                    </div>
                    <div className="w-full md:w-1/2">
                      {values.volunteerCategory ===
                        VOLUNTEER_CATEGORY_WITH_BENEFICIARIES && (
                        <Input
                          name="beneficiariesCount"
                          label={t("COMMON.BENEFICIARIES_COUNT")}
                          type="text"
                          onFocus={() =>
                            setFieldTouched("beneficiariesCount", true)
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex 2xl:gap-[143px] laptopitm:gap-[100px] lg:gap-[100px] miniscreen:gap-[85px] miniscreen7:gap-[95px] miniscreen6:gap-[120px] msscreen1:gap-[140px] justify-center mobilescreen:gap-1 mobilescreen:flex-col mb-4 mobilescreen:mb-4 checkbox-container">
                    <CheckBox
                      id="interview"
                      label={t("COMMON.KUWAITIS.ONLY")}
                      checked={selectedCheckBoxes.includes("interview")}
                      onChange={(checked) =>
                        handleCheckboxChange("interview", checked)
                      }
                    />
                    <CheckBox
                      id="disabled"
                      label={t("COMMON.SUPPORTS_DISABLED")}
                      checked={selectedCheckBoxes.includes("disabled")}
                      onChange={(checked) =>
                        handleCheckboxChange("disabled", checked)
                      }
                    />
                    <CheckBox
                      id="relief"
                      label={t("COMMON.RELIEF")}
                      checked={selectedCheckBoxes.includes("relief")}
                      onChange={(checked) =>
                        handleCheckboxChange("relief", checked)
                      }
                    />
                    <CheckBox
                      id="urgent"
                      label={t("COMMON.URGENT")}
                      checked={selectedCheckBoxes.includes("urgent")}
                      onChange={(checked) =>
                        handleCheckboxChange("urgent", checked)
                      }
                    />
                    <CheckBox
                      id="emergency"
                      label={t("COMMON.EMERGENCY_PRIORITY")}
                      checked={selectedCheckBoxes.includes("emergency")}
                      onChange={(checked) =>
                        handleCheckboxChange("emergency", checked)
                      }
                    />
                  </div>

                  <div className="descritpionitm descritpionitm-ar">
                    <Field
                      name="description_ar"
                      label={t("COMMON.DESCRIPTION_AR")}
                      placeholder={t("COMMON.DESCRIPTION_AR")}
                      component={RichTextEditor}
                      language="ar"
                    />
                  </div>

                  <div className="descritpionitm descritpionitm-en">
                    <Field
                      name="description_en"
                      label={t("COMMON.DESCRIPTION_EN")}
                      placeholder={t("COMMON.DESCRIPTION_EN")}
                      component={RichTextEditor}
                      language="en"
                    />
                  </div>

                  <TagsCheckbox
                    name="_interests"
                    label={t("COMMON.ENTER_TAGS")}
                    setFieldValue={setFieldValue}
                    setFieldTouched={setFieldTouched}
                    values={values._interests}
                    errors={errors._interests as string | undefined}
                    touched={touched._interests as boolean | undefined}
                    options={tagOptions}
                    disabled={tagsLoading}
                  />

                  <FieldArray name="sponsors">
                    {({ push, remove }) => (
                      <div className="mb-4">
                        {values.sponsors.map((sponsor, index) => (
                          <div
                            key={index}
                            className="flex mobilescreen:flex-col gap-6 uploaddocfiles mb-4 items-center"
                          >
                            <SelectInput
                              key={sponsor.sponsorId}
                              className="w-full mb-0"
                              name={`sponsors[${index}].sponsorId`}
                              label={t("COMMON.SELECT_SPONSOR")}
                              options={sponsorOptions.filter(
                                (option) =>
                                  !values.sponsors.some(
                                    (s, i) =>
                                      i !== index && s.sponsorId === option.value
                                  )
                              )}
                              onMenuScrollToBottom={handleMenuScroll}
                              disabled={sponsorsLoading}
                              isLoading={sponsorsLoading || sponsorsFetching}
                              isSearchable={false}
                              onChange={(selectedOption) =>
                                setFieldValue(
                                  `sponsors[${index}].sponsorId`,
                                  selectedOption?.value || ""
                                )
                              }
                            />
                            <div className="flex items-center gap-2">
                              {index === values.sponsors.length - 1 && (
                                <FaPlus
                                  size={20}
                                  onClick={() =>
                                    push({
                                      sponsorId: "",
                                      position: values.sponsors.length + 1,
                                    })
                                  }
                                  className="text-primary-5 hover:text-primary-6 hover:cursor-pointer"
                                />
                              )}
                              {index > 0 && (
                                <FaMinus
                                  onClick={() => remove(index)}
                                  className="text-primary-5 hover:text-primary-6 hover:cursor-pointer"
                                  size={20}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                        {touched.sponsors &&
                          typeof errors.sponsors === "string" && (
                            <div className="text-red-500 text-sm mt-2">
                              {errors.sponsors}
                            </div>
                          )}
                      </div>
                    )}
                  </FieldArray>

                  <div className="pb-4">
                    <UploadDocument
                      name="opportunity_images"
                      label={t("COMMON.UPLOAD_IMAGE")}
                      accept="image/jpeg, image/png"
                      multiple
                      setFieldValue={setFieldValue}
                      existingFiles={modifiedOpportunityImages.map((file) => ({
                        id: file.id,
                        image: file.image,
                      }))}
                      onRemove={(index, isExisting) =>
                        handleRemoveExistingFile(
                          index,
                          isExisting,
                          "opportunity_images",
                          setFieldValue,
                          values
                        )
                      }
                      enableCropping
                      cropAspectRatio={1} // Square, matching the 1:1 cards
                      cropShape="rect"
                      cropDisplayMode="opportunity"
                      cropWidth={600}
                      cropHeight={600} // 1:1
                    />
                  </div>

                  <div>
                    <UploadDocument
                      name="license_image"
                      label={t("COMMON.UPLOAD_LICENSE_IMAGE")}
                      multiple={false}
                      accept="image/jpeg, image/png"
                      setFieldValue={setFieldValue}
                      existingFiles={modifiedLicenseImage.map((file) => ({
                        id: file.id,
                        image: file.image,
                      }))}
                      onRemove={(index, isExisting) =>
                        handleRemoveExistingFile(
                          index,
                          isExisting,
                          "license_image",
                          setFieldValue,
                          values
                        )
                      }
                      enableCropping={false} // License images are uploaded as-is
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        event.preventDefault();
                        const file = event.target.files
                          ? event.target.files[0]
                          : null;
                        setFieldValue("license_image", file);
                        // Picking a new file cancels a pending removal
                        if (file) {
                          setFieldValue("license_image_removed", false);
                        }
                      }}
                    />
                  </div>

                  <div className="flex justify-center 2xl:pt-[70px] laptopmain:2xl:pt-[40px] laptop:pt-[40px] pt-[40px]">
                    <Button
                      type="button"
                      variant="primary"
                      size="medium"
                      disabled={submitLoading || updateLoading || isSubmitting}
                      onClick={handleFormSubmit}
                    >
                      {id && !isRepublish
                        ? opportunityData?.approval_status === "rejected"
                          ? t("COMMON.EDIT_AND_RESUBMIT")
                          : t("COMMON.SAVE")
                        : isRepublish
                          ? t("COMMON.REPOST")
                          : t("COMMON.PUBLISH")}
                    </Button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </div>
      </div>
    </>
  );
}
