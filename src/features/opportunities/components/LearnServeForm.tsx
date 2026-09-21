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
import { FaLink, FaMapMarkerAlt, FaMinus, FaPlus } from "react-icons/fa";
import * as Yup from "yup";

import AgeRange from "@/components/ui/AgeRange";
import { Button } from "@/components/ui/Button";
import DatePickerInput from "@/components/ui/DateField";
import DisabledButtonWithTooltip from "@/components/ui/DisabledButtonWithTooltip";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import RichTextEditor from "@/components/ui/RichTextEditor";
import SelectInput from "@/components/ui/SelectInput";
import { TagsCheckbox } from "@/components/ui/TagsCheckbox";
import TimepickerInput from "@/components/ui/TimePicker";
import UploadDocument from "@/components/ui/UploadDocument";
import Title from "@/components/shared/Title";
import { getDropdownChoicesRequest } from "@/features/auth/services/authApi";
import EventCreateTimingModal from "@/features/events/components/EventCreateTimingModal";
import EventTimeSlotModal from "@/features/events/components/EventTimeSlotModal";
import type { TimeSlot } from "@/features/shared";
import { checkLicenseRequirement, deleteOpportunityImage, syncOpportunitySponsors } from "@/features/opportunities/services/opportunities";
import { createLearnServeOpportunity, getLearnServeOpportunityById, updateLearnServeOpportunity } from "@/features/opportunities/services/learnServe";
import { deleteAllTimeSlots, getTimeSlots } from "@/features/opportunities/services/registrations";
import { getAllOrganizations } from "@/features/shared/services/directory";
import { submitToleratingInterestIds } from "@/features/shared/interestIdsFallback";
import { getApiErrorMessage, getApiErrorMessages } from "@/lib/api/errors";
import i18n from "@/lib/i18n/config";
import { fetchAddress, fetchCoordinates, formatDateToYYYYMMDD } from "@/lib/helpers";
import { normalizeInterests, resolveInterestOptionIds } from "@/lib/interests";
import { NAV_STATE_KEYS, useConsumedNavState } from "@/lib/navigationState";
import { YupFlexibleUrl, YupOptionalUrl, YupNumberOnly, YupRequiredString, YupStringMaxLength, YupWhatsAppLink } from "@/features/shared/schemas";
import { getOrganizerProfile } from "@/features/profile/services/profileApi";
import {
  OPPORTUNITY_NATIONALITY_FIELD_LIVE,
  opportunityNationalityFrom,
  opportunityNationalityOptions,
  opportunityNationalityToLegacyFlag,
  type OpportunityNationality,
} from "@/data/Constants";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useTimeSlotsStore } from "@/store/timeSlotsStore";
import CreateTiming from "./CreateTiming";
import UpdateLearnServeConfirmModal from "./UpdateLearnServeConfirmModal";

/**
 * A half-finished creation flow is resumable across reloads, so the new
 * opportunity's id and schedule are parked in localStorage until the form is
 * submitted for real.
 */
const OPPORTUNITY_ID_KEY = "learnServe_opportunityId";
const OPPORTUNITY_DETAILS_KEY = "learnServe_opportunityDetails";

/**
 * A rich-text editor never reports an empty string once it has been focused —
 * it leaves `<p></p>` or `<p><br></p>` behind — so "is there a description?"
 * has to be asked of the text, not of the markup. Same helper as
 * `VolunteerForm`, which asks the same question.
 */
const richTextToPlain = (value?: string | null): string =>
  (value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

/**
 * Last-resort value for the platform's cut of a paid opportunity.
 *
 * Both live sources are wired up — `LearnServeOpportunityResource` when editing
 * (BE-71) and `GET /organization-profile/` when creating (BE-74), and both read
 * the same `Config::platformFeePercentage()` server-side, so they cannot
 * disagree. This only shows if neither payload has arrived, and it matches the
 * backend's own default for that config key.
 */
const PLATFORM_FEE_PERCENT_FALLBACK = 7;

/** Payload a learn & serve card stashes before pushing to /learn-and-share-form. */
export interface LearnServeFormNavState {
  id?: string;
  isRepublish?: boolean;
}

interface LearnServeFormValues {
  license_image_removed: boolean;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  dueDate: string;
  startDate: string;
  endDate: string;
  participantsNeeded: string;
  age: [number | null, number | null];
  startTime: string;
  endTime: string;
  learningType: string;
  learnServeFormat: string;
  certificateType: string;
  location: string;
  location_url: string;
  latitude: string;
  longitude: string;
  meetingLink: string;
  whatsappLink: string;
  opportunity_images: File[];
  _interests: string[];
  sponsors: { sponsorId: string; position: number }[];
  primary_language: string;
  license_image?: File | string;
  gender: string;
  /*
   * Both are `"true"` / `"false"` strings rather than booleans: they are
   * rendered as `SelectInput`, which binds through Formik by name and matches
   * the field value against its option values. Converted back at submit.
   */
  opportunity_nationality: string;
  is_paid: string;
  /** Kept as a string: it is a text input, and "" is how "not answered" reads. */
  price: string;
}

interface LearnServeFormProps {
  autoSetTimeOnClick?: boolean; // Auto-set time fields to 12:00 on first click
  /**
   * Set by the `/learn-and-share-form/edit/{id}` route. Takes precedence over
   * the sessionStorage payload, so the edit screen survives a reload — the
   * stashed nav state only ever survived one navigation. Repost still arrives
   * through nav state (`isRepublish`), since it creates a new opportunity.
   */
  opportunityId?: string;
}

// Leaflet touches `window` at import time, so it can't be part of the SSR pass.
const LocationMapPicker = dynamic(
  () => import("@/components/ui/LocationMapPicker"),
  { ssr: false }
);

interface OpportunityDetails {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

/** Choice labels the form branches on, per language. */
const LABELS = {
  online: { en: "ONLINE", ar: "عن بعد" },
  inPerson: { en: "IN PERSON", ar: "حضوري" },
  internship: { en: "Internship", ar: "تدريب عملي" },
  course: { en: "Course", ar: "دورة" },
  forsaCertificate: { en: "Forsa Certificate", ar: "شهادة فرصة" },
} as const;

const labelFor = (
  key: keyof typeof LABELS,
  language: string
): string => LABELS[key][language === "ar" ? "ar" : "en"];

const findOptionValue = (
  options: Array<{ label: string; value: string }>,
  key: keyof typeof LABELS,
  language: string
): string | undefined =>
  options.find((option) => option.label === labelFor(key, language))?.value;

/**
 * Side effects that need Formik's bag. Kept out of the render prop so the hooks
 * aren't declared inside a callback.
 */
function LearnServeFormEffects({
  values,
  touched,
  validateForm,
  setFieldValue,
  opportunityData,
  id,
  selectedLanguage,
  timeSlotModalOpen,
  setInitialTimeSlots,
  skipNextGeocodeRef,
}: {
  values: LearnServeFormValues;
  touched: Record<string, unknown>;
  validateForm: () => Promise<unknown>;
  setFieldValue: (field: string, value: any) => void;
  opportunityData: any;
  id?: string;
  selectedLanguage: string;
  timeSlotModalOpen: boolean;
  setInitialTimeSlots: (slots: TimeSlot[]) => void;
  skipNextGeocodeRef: { current: boolean };
}) {
  const timeSlots = useTimeSlotsStore((s) => s.timeSlots);
  const setTimeSlots = useTimeSlotsStore((s) => s.setTimeSlots);
  const clearTimeSlots = useTimeSlotsStore((s) => s.clearTimeSlots);

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
        touched[fieldName] && !!values[fieldName as keyof LearnServeFormValues]
    );
    if (touchedFields.length > 0) {
      validateForm();
    }
  }, [values, touched, validateForm]);

  // Seed the shared draft store from the saved schedule when editing
  useEffect(() => {
    const saved = opportunityData?.timeslots_display;
    if (!saved) return;
    if (saved.length > 0) {
      setTimeSlots(saved);
    } else {
      clearTimeSlots();
    }
  }, [opportunityData?.timeslots_display, setTimeSlots, clearTimeSlots]);

  // Snapshot the slots when the modal opens so edits can be detected on close
  useEffect(() => {
    if (timeSlotModalOpen) {
      setInitialTimeSlots([...timeSlots]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlotModalOpen]);

  return null;
}

export default function LearnServeForm({
  autoSetTimeOnClick = true,
  // Renamed: `opportunityId` is already taken by the in-progress-create state below.
  opportunityId: editOpportunityId,
}: LearnServeFormProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authToken = user?.auth_token;
  // Set right before a map pick / a data sync fills `location` in
  // programmatically, so the forward-geocode effect skips that one change.
  const skipNextGeocodeRef = useRef(false);

  const timeSlots = useTimeSlotsStore((s) => s.timeSlots);
  const setTimeSlots = useTimeSlotsStore((s) => s.setTimeSlots);
  const clearTimeSlots = useTimeSlotsStore((s) => s.clearTimeSlots);

  // Check if license is required for the logged-in user
  const { data: licenseRequirementData } = useQuery({
    queryKey: ["check-license-requirement"],
    queryFn: checkLicenseRequirement,
    enabled: Boolean(authToken),
  });
  const isLicenseRequired =
    licenseRequirementData?.data?.license_required ?? true;

  // Edit / repost target arrives via sessionStorage (React Router `location.state`).
  const navState = useConsumedNavState<LearnServeFormNavState>(
    NAV_STATE_KEYS.learnServeForm
  );
  // The route param wins; nav state is the fallback for repost and for any
  // caller still pushing the bare form path.
  const id = editOpportunityId ?? navState?.id;
  const isRepublish = navState?.isRepublish;

  const [open, setOpen] = useState(false);
  const [opentime, setOpentime] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [initialTimeSlots, setInitialTimeSlots] = useState<TimeSlot[]>([]);
  const [pendingFormData, setPendingFormData] = useState<{
    values: LearnServeFormValues;
    helpers: FormikHelpers<LearnServeFormValues>;
  } | null>(null);

  const [sponsorList, setSponsorList] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [preLoadedSponsors, setPreLoadedSponsors] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [sponsorIdsToFetch, setSponsorIdsToFetch] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [modifiedOpportunityImages, setModifiedOpportunityImages] = useState<
    Array<{ id: number; image: string }>
  >([]);
  const [modifiedLicenseImage, setModifiedLicenseImage] = useState<
    Array<{ id: number; image: string }>
  >([]);
  const [existingImageIds, setExistingImageIds] = useState<number[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);

  const [formKey, setFormKey] = useState(0);

  // Force Formik to remount when the language changes
  useEffect(() => {
    setFormKey((prevKey) => prevKey + 1);
  }, [selectedLanguage]);

  const areTimeSlotsUnchanged = useMemo(() => {
    if (initialTimeSlots.length !== timeSlots.length) return false;

    return initialTimeSlots.every((initialSlot, index) => {
      const currentSlot = timeSlots[index];
      return (
        initialSlot.id === currentSlot.id &&
        initialSlot.date === currentSlot.date &&
        initialSlot.start_time === currentSlot.start_time &&
        initialSlot.end_time === currentSlot.end_time &&
        initialSlot.participants_needed === currentSlot.participants_needed &&
        initialSlot.isSaved === currentSlot.isSaved
      );
    });
  }, [initialTimeSlots, timeSlots]);

  useEffect(() => {
    if (!open) return;
    setDisableSaveButton(areTimeSlotsUnchanged);
  }, [areTimeSlotsUnchanged, open]);

  const { data: apiResponse, isLoading: isLoadingOpportunity } = useQuery({
    queryKey: ["learn-serve-opportunity-form", id],
    queryFn: () => getLearnServeOpportunityById(id as string),
    enabled: Boolean(id),
  });

  const opportunityData = apiResponse?.data;

  /*
   * BE-74 — the publish form's only source for the platform fee, since there is
   * no opportunity to read it off until one exists. Shares the
   * `["organizer-profile"]` key with the profile screens, so a publisher who
   * has already been there pays nothing for this. `retry: false` because an
   * account type without an organization profile should fall back to the
   * constant quietly rather than retry a refusal three times.
   */
  const { data: organizerProfile } = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: getOrganizerProfile,
    enabled: Boolean(authToken),
    retry: false,
  });

  /*
   * The English title, the English description and the map picker are each a
   * second way to answer a question the form already asks once. They stay off
   * screen until asked for, exactly as on `VolunteerForm`.
   *
   * `null` means "the organizer hasn't decided", which lets each panel follow
   * the record — open when editing an opportunity that already carries the
   * second answer, closed otherwise. Once they click either way, their choice
   * wins.
   */
  const [englishTitleToggle, setEnglishTitleToggle] = useState<boolean | null>(
    null
  );
  const [englishDescriptionToggle, setEnglishDescriptionToggle] = useState<
    boolean | null
  >(null);
  const [mapPickerToggle, setMapPickerToggle] = useState<boolean | null>(null);

  /*
   * Only a *different* English title counts as one the organizer wrote. An
   * opportunity created without opening the English panel stores the Arabic
   * title in both columns, so treating any non-empty `title_en` as deliberate
   * would re-open the panel on every edit and show Arabic text in a field
   * labelled English.
   */
  const hasDistinctEnglishTitle = useMemo(() => {
    const arabic = (opportunityData?.title_ar || "").trim();
    const english = (opportunityData?.title_en || "").trim();
    return english !== "" && english !== arabic;
  }, [opportunityData?.title_ar, opportunityData?.title_en]);
  const showEnglishTitle = englishTitleToggle ?? hasDistinctEnglishTitle;

  const hasDistinctEnglishDescription = useMemo(() => {
    const arabic = (opportunityData?.description_ar || "").trim();
    const english = (opportunityData?.description_en || "").trim();
    return richTextToPlain(english) !== "" && english !== arabic;
  }, [opportunityData?.description_ar, opportunityData?.description_en]);
  const showEnglishDescription =
    englishDescriptionToggle ?? hasDistinctEnglishDescription;

  const hasStoredMapLocation = Boolean(
    opportunityData?.latitude && opportunityData?.longitude
  );
  const showMapPicker = mapPickerToggle ?? hasStoredMapLocation;

  // Refresh the form once opportunity data arrives
  useEffect(() => {
    if (opportunityData) {
      setFormKey((prevKey) => prevKey + 1);
    }
  }, [id, opportunityData]);

  const createOpportunityMutation = useMutation({
    mutationFn: createLearnServeOpportunity,
  });
  const updateOpportunityMutation = useMutation({
    mutationFn: updateLearnServeOpportunity,
  });
  const deleteTimeSlotsMutation = useMutation({
    mutationFn: deleteAllTimeSlots,
  });
  const submitLoading = createOpportunityMutation.isPending;
  const updateLoading = updateOpportunityMutation.isPending;

  /**
   * Editing keeps the real id; creating remembers whatever the last unfinished
   * attempt produced so its time slots can still be attached.
   */
  const [opportunityId, setOpportunityId] = useState<number | null>(null);
  useEffect(() => {
    if (navState === null) return;
    if (id && !isRepublish) {
      setOpportunityId(Number(id));
      return;
    }
    const savedId = localStorage.getItem(OPPORTUNITY_ID_KEY);
    setOpportunityId(savedId ? Number(savedId) : null);
  }, [navState, id, isRepublish]);

  const [opportunityDetails, setOpportunityDetails] =
    useState<OpportunityDetails>({
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
    });

  // Restore the in-progress schedule for a create flow
  useEffect(() => {
    if (navState === null || id) return;
    const savedDetails = localStorage.getItem(OPPORTUNITY_DETAILS_KEY);
    if (savedDetails) {
      try {
        setOpportunityDetails(JSON.parse(savedDetails));
      } catch {
        // A malformed entry is not worth blocking the form over
      }
    }
  }, [navState, id]);

  // Editing takes its schedule straight from the loaded opportunity
  useEffect(() => {
    if (!id || !opportunityData || isRepublish) return;
    setOpportunityDetails({
      startDate: opportunityData.start_date || "",
      endDate: opportunityData.end_date || "",
      startTime: opportunityData.start_time?.slice(0, 5) || "",
      endTime: opportunityData.end_time?.slice(0, 5) || "",
    });
  }, [id, opportunityData, isRepublish]);

  useEffect(() => {
    if (opportunityId) {
      localStorage.setItem(OPPORTUNITY_ID_KEY, opportunityId.toString());
    }
  }, [opportunityId]);

  useEffect(() => {
    // Only the create flow needs its progress persisted
    if (id) return;
    localStorage.setItem(
      OPPORTUNITY_DETAILS_KEY,
      JSON.stringify(opportunityDetails)
    );
  }, [opportunityDetails, id]);

  const { refetch: refetchTimeSlots } = useQuery({
    queryKey: ["opportunity-time-slots", opportunityId],
    queryFn: () => getTimeSlots(opportunityId as number),
    enabled: Boolean(opportunityId),
  });

  // Mirror the loaded opportunity into local image / sponsor state
  useEffect(() => {
    if (!opportunityData) {
      // Republishing starts from a blank image set
      setModifiedOpportunityImages([]);
      setExistingImageIds([]);
      return;
    }

    // Only images captured before completion belong to the editable set.
    // A repost is a NEW run of the opportunity, so none of the source's images
    // carry over at all — the gallery was shot during the previous run and
    // cannot stand for the new one. Starting empty makes the required-images
    // rule force a fresh upload. Mirrors VolunteerForm.
    const oppImages = isRepublish
      ? []
      : (opportunityData.opportunity_images
          ?.filter((img: any) => img.is_after_completed === false)
          .map((img: any) => ({ id: img.id, image: img.image })) || []);

    setModifiedOpportunityImages(oppImages);
    setModifiedLicenseImage(
      opportunityData.license_image
        ? [{ id: 0, image: opportunityData.license_image }]
        : []
    );
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
  }, [opportunityData, isRepublish]);

  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ["learnserve-opportunity-interest-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("learnserve_opportunity_interest"),
    enabled: !!selectedLanguage,
  });

  const { data: genderData, isLoading: genderLoading } = useQuery({
    queryKey: ["opportunity-gender-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("opportunity_gender"),
    enabled: !!selectedLanguage,
  });

  const { data: learningTypeData, isLoading: learningTypeLoading } = useQuery({
    queryKey: ["learning-type-choices"],
    queryFn: () => getDropdownChoicesRequest("learning_type"),
  });

  const { data: learnServeFormatData, isLoading: learnServeFormatLoading } =
    useQuery({
      queryKey: ["learn-serve-format-choices"],
      queryFn: () => getDropdownChoicesRequest("learn_serve_format"),
    });

  const { data: certificateTypeData, isLoading: certificateTypeLoading } =
    useQuery({
      queryKey: ["learn-serve-certificate-type-choices"],
      queryFn: () =>
        getDropdownChoicesRequest("learn_serve_certificate_type"),
    });

  const {
    data: sponsorsData,
    isLoading: sponsorsLoading,
    isFetching: sponsorsFetching,
  } = useQuery({
    queryKey: ["all-organizations", currentPage],
    queryFn: () =>
      getAllOrganizations({ name: "", page: currentPage, limit: 10 }),
    enabled: Boolean(authToken),
  });

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

  const handleMenuScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    if (
      target.scrollHeight - target.scrollTop === target.clientHeight &&
      !sponsorsLoading
    ) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Seed sponsorList with the pre-loaded (nested object) sponsors
  useEffect(() => {
    if (preLoadedSponsors.length === 0) return;
    setSponsorList((prev) => {
      const newSponsors = preLoadedSponsors.filter(
        (preLoaded) => !prev.some((existing) => existing.id === preLoaded.id)
      );
      return newSponsors.length ? [...newSponsors, ...prev] : prev;
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
      return newSponsors.length ? [...newSponsors, ...prev] : prev;
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
      if (!newSponsors.length) return prev;
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

  const tagOptions: Array<{ id: string; label: string }> =
    tagsData?.data?.map((item: any) => ({
      id: String(item.id),
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
    })) || [];

  const genderOptions =
    genderData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  /** Display order for the learning-type dropdown, regardless of API order. */
  const learningTypeOrder = [
    "Class/Workshop",
    "Course",
    "Consultation",
    "Internship",
  ];

  const learningTypeOptions: Array<{ label: string; value: string }> =
    learningTypeData?.data
      // Internships are only offered by organizations
      ?.filter(
        (item: any) =>
          !(
            item.value_en === "Internship" &&
            user?.user_type !== "organization"
          )
      )
      .sort(
        (a: any, b: any) =>
          learningTypeOrder.indexOf(a.value_en) -
          learningTypeOrder.indexOf(b.value_en)
      )
      .map((item: any) => ({
        label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
        value: item.id,
      })) || [];

  const learnServeFormatOptions: Array<{ label: string; value: string }> =
    learnServeFormatData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  const certificateTypeOptions: Array<{ label: string; value: string }> =
    certificateTypeData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  const onlineFormatId = findOptionValue(
    learnServeFormatOptions,
    "online",
    selectedLanguage
  );
  const inPersonFormatId = findOptionValue(
    learnServeFormatOptions,
    "inPerson",
    selectedLanguage
  );
  const internshipTypeId = findOptionValue(
    learningTypeOptions,
    "internship",
    selectedLanguage
  );
  const courseTypeId = findOptionValue(
    learningTypeOptions,
    "course",
    selectedLanguage
  );
  const forsaCertificateId = certificateTypeOptions.find(
    (option) =>
      option.label === LABELS.forsaCertificate.en ||
      option.label === LABELS.forsaCertificate.ar
  )?.value;

  const initialValues: LearnServeFormValues = {
    title_ar: opportunityData?.title_ar || "",
    /*
     * Only a title the organizer actually wrote in English is loaded. An
     * opportunity created without opening the English panel stores the Arabic
     * title in both columns, so prefilling from it would put Arabic text in a
     * field labelled English the moment the panel is opened. Same reasoning
     * for the description.
     */
    title_en: hasDistinctEnglishTitle ? opportunityData?.title_en || "" : "",
    description_ar: opportunityData?.description_ar || "",
    description_en: hasDistinctEnglishDescription
      ? opportunityData?.description_en || ""
      : "",
    dueDate: opportunityData?.due_date || "",
    startDate: opportunityData?.start_date || "",
    endDate: opportunityData?.end_date || "",
    participantsNeeded: opportunityData?.participants_needed?.toString() || "",
    age: [
      opportunityData?.from_age ? Number(opportunityData.from_age) : null,
      opportunityData?.to_age ? Number(opportunityData.to_age) : null,
    ],
    startTime: opportunityData?.start_time?.slice(0, 5) || "",
    endTime: opportunityData?.end_time?.slice(0, 5) || "",
    learningType: opportunityData?.learning_type_display?.id || "",
    learnServeFormat: opportunityData?.format_display?.id || "",
    certificateType: opportunityData?.certificate_type_display?.id || "",
    location: opportunityData?.map_desc || "",
    location_url: opportunityData?.location_url || "",
    latitude: opportunityData?.latitude?.toString() || "",
    longitude: opportunityData?.longitude?.toString() || "",
    meetingLink: opportunityData?.link || "",
    whatsappLink: opportunityData?.whatsapp_link || "",
    gender: opportunityData?.gender_display?.id || "",
    opportunity_nationality: opportunityNationalityFrom(
      opportunityData ?? {}
    ),
    is_paid: String(opportunityData?.is_paid === true),
    price:
      opportunityData?.price !== null && opportunityData?.price !== undefined
        ? String(opportunityData.price)
        : "",
    opportunity_images: [],
    license_image: "",
    _interests: resolveInterestOptionIds(
      normalizeInterests(
        opportunityData?.interest_display,
        opportunityData?.interests
      ),
      tagOptions
    ),
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
    primary_language: selectedLanguage || "en",
  };

  /*
   * The fee note under the price field, from whichever payload can answer.
   *
   * Editing reads it off the opportunity (BE-71); creating has no opportunity
   * yet, so it comes from the publisher's own profile (BE-74). Both are
   * `Config::platformFeePercentage()` on the server, so the number is the same
   * either way — this is only about which payload is available when.
   *
   * A `typeof === "number"` test rather than `||` or `??` on its own: an admin
   * waiving the fee to **0** is a real answer, and `0 || fallback` would quietly
   * replace it with 7.
   */
  const platformFeePercent =
    typeof opportunityData?.platform_fee_percentage === "number"
      ? opportunityData.platform_fee_percentage
      : typeof organizerProfile?.data?.platform_fee_percentage === "number"
        ? organizerProfile.data.platform_fee_percentage
        : PLATFORM_FEE_PERCENT_FALLBACK;

  const notInPast = (value?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    return !value || new Date(value) >= today;
  };

  const validationSchema = useMemo(() => {
    const titleSchema = YupStringMaxLength(400)
      .min(2, () => i18n.t("COMMON.EVENT_TITLE_MIN_LENGTH"))
      .concat(YupRequiredString);
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
          if (!value) return true;
          const textContent = value
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();
          return textContent.length >= 10;
        }
      );

    /*
     * Optional, and built from scratch rather than from `YupStringMaxLength` —
     * that helper descends from `YupRequiredString`, so anything composed out
     * of it stays required no matter what is chained on afterwards. The length
     * rule still applies to whatever is actually typed.
     *
     * They have to be optional now that the English panels open on request:
     * required rules on a collapsed field block submit with an error nobody
     * can see. The API still requires both columns, so the submit falls back
     * to the Arabic text — see `handleSubmit`.
     */
    const optionalTitleSchema = Yup.string()
      .max(
        400,
        () =>
          `${i18n.t("COMMON.MUST.BE.ATMOST")}400${i18n.t("COMMON.CHARACTERS")}`
      )
      .test(
        "title-en-min-length",
        () => i18n.t("COMMON.EVENT_TITLE_MIN_LENGTH"),
        (value) => !value || value.trim().length >= 2
      );
    const optionalDescriptionSchema = Yup.string().test(
      "description-en-min-length",
      () => i18n.t("COMMON.DESCRIPTION_MIN_LENGTH"),
      (value) => {
        const text = richTextToPlain(value);
        return text.length === 0 || text.length >= 10;
      }
    );

    return Yup.object({
        title_ar: titleSchema,
        title_en: optionalTitleSchema,
        description_ar: descriptionSchema,
        description_en: optionalDescriptionSchema,
        /*
         * Required, matching volunteering. The client reverted the
         * optional-due-date decision for volunteer opportunities first and
         * confirmed on 2026-09-20 that development follows it — every
         * opportunity states its own registration deadline again.
         *
         * `notInPast` and the before-start-date test both short-circuit on an
         * empty value; `YupRequiredString` is what stops it being empty at all,
         * so the ordering between them does not matter.
         */
        dueDate: Yup.string()
          .concat(YupRequiredString)
          .test(
            "due-date-in-future",
            i18n.t("COMMON.DATE_MUST_BE_FUTURE"),
            notInPast
          )
          .test(
            "due-date-before-start-date",
            i18n.t("COMMON.DUE_DATE_BEFORE_START"),
            function (value) {
              const startDate = this.parent.startDate;
              return (
                !value || !startDate || new Date(value) < new Date(startDate)
              );
            }
          ),
        startDate: Yup.string()
          .concat(YupRequiredString)
          .test(
            "start-date-in-future",
            i18n.t("COMMON.DATE_MUST_BE_FUTURE"),
            notInPast
          ),
        endDate: Yup.string()
          .concat(YupRequiredString)
          .test(
            "end-date-in-future",
            i18n.t("COMMON.DATE_MUST_BE_FUTURE"),
            notInPast
          )
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
        startTime: Yup.string()
          .concat(YupRequiredString)
          .test(
            "start-time-valid",
            i18n.t("COMMON.INVALID_TIME_FORMAT"),
            (value) => !!value && /^[0-2][0-9]:[0-5][0-9]$/.test(value)
          ),
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
        learningType: YupRequiredString,
        learnServeFormat: YupRequiredString,
        /*
         * Courses and internships are the two types that grant a certificate,
         * so both must declare which one. The API enforces exactly that
         * ("Certificate type is required for courses and internships"), and
         * this used to check internships only — a course submitted without a
         * certificate type passed here and came back a 422 with no field
         * highlighted.
         */
        certificateType: Yup.string().when("learningType", {
          is: (value: string) =>
            (!!internshipTypeId && value === internshipTypeId) ||
            (!!courseTypeId && value === courseTypeId),
          then: () => YupRequiredString,
          otherwise: () => Yup.string(),
        }),
        /*
         * "Where" can now be answered two ways — a pinned map or a pasted
         * link — and only one is on screen at a time, so requiring `location`
         * outright would block submit with an error attached to a field the
         * organizer cannot see. The rule is "at least one", checked from both
         * sides so whichever field is visible shows the message, and it only
         * binds for an in-person opportunity.
         *
         * Both use `.test` rather than `Yup.when`, which would make the two
         * fields reference each other and throw a cyclic-dependency error at
         * schema build time — hence `learnServeFormat` read off `this.parent`.
         */
        location: Yup.string().test(
          "location-provided",
          () => i18n.t("COMMON.REQUIRED.FIELD"),
          function (value) {
            const isInPersonFormat =
              !!inPersonFormatId &&
              String(this.parent.learnServeFormat) === String(inPersonFormatId);
            if (!isInPersonFormat) return true;
            return Boolean(value?.trim() || this.parent.location_url?.trim());
          }
        ),
        location_url: YupOptionalUrl.test(
          "location-provided",
          () => i18n.t("COMMON.REQUIRED.FIELD"),
          function (value) {
            const isInPersonFormat =
              !!inPersonFormatId &&
              String(this.parent.learnServeFormat) === String(inPersonFormatId);
            if (!isInPersonFormat) return true;
            return Boolean(value?.trim() || this.parent.location?.trim());
          }
        ),
        meetingLink: Yup.string().when(
          "learnServeFormat",
          ([learnServeFormat], schema) =>
            learnServeFormat &&
            onlineFormatId &&
            String(learnServeFormat) === String(onlineFormatId)
              ? schema.concat(YupFlexibleUrl)
              : schema
        ),
        // BE-65 — optional here, unlike volunteering where the contact is
        // required. Validated against the real WhatsApp domains so a meeting
        // URL cannot be pasted into the contact field by mistake; the API only
        // checks it is a URL.
        whatsappLink: YupWhatsAppLink,
        /*
         * The API already refuses a paid opportunity with no price
         * (`'price' => ['A price is required for a paid opportunity.']`), and
         * until now this form never sent the field at all — so every paid
         * development opportunity 422'd. Validated here as well so the
         * organizer is told in the field rather than by a toast after submit.
         */
        price: Yup.string().when("is_paid", ([isPaid], schema) =>
          isPaid === "true"
            ? schema
                .concat(YupRequiredString)
                .test(
                  "price-positive",
                  () => i18n.t("COMMON.VALID_NUMBERS"),
                  (value) => Number(value) > 0
                )
            : schema
        ),
        participantsNeeded: YupNumberOnly,
        gender: Yup.string().concat(YupRequiredString),
        age: Yup.array()
          .of(Yup.number().nullable())
          .test(
            "start-age-required",
            i18n.t("COMMON.REQUIRED.FIELD"),
            (value) =>
              Array.isArray(value) && value.length > 0 && value[0] !== null
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
        opportunity_images: Yup.mixed().test(
          "has-files",
          i18n.t("COMMON.REQUIRED.FIELD"),
          (value) =>
            (Array.isArray(value) && value.length > 0) ||
            modifiedOpportunityImages.length > 0
        ),
        _interests: Yup.array()
          .of(Yup.string())
          .min(1, i18n.t("COMMON.REQUIRED.FIELD")),
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
  }, [
    inPersonFormatId,
    onlineFormatId,
    internshipTypeId,
    courseTypeId,
    isLicenseRequired,
    id,
    modifiedLicenseImage,
    modifiedOpportunityImages,
  ]);

  const reportSubmitError = (error: unknown, isUpdate: boolean) => {
    const messages = getApiErrorMessages(error, selectedLanguage);
    if (messages.length > 0) {
      messages.forEach((message) => toast.error(message));
    } else {
      toast.error(
        isUpdate && !isRepublish
          ? t("COMMON.TOAST.UPDATE_OPPORTUNITY_FAILED")
          : t("COMMON.TOAST.CREATE_OPPORTUNITY_FAILED")
      );
    }
  };

  const proceedWithSubmission = async (
    values: LearnServeFormValues,
    helpers: FormikHelpers<LearnServeFormValues>,
    isUpdate: boolean
  ) => {
    try {
      const formData = new FormData();

      const formattedStartDate = formatDateToYYYYMMDD(values.startDate);
      const formattedEndDate = formatDateToYYYYMMDD(values.endDate);
      const formattedStartTime = `${values.startTime}:00`;
      const formattedEndTime = `${values.endTime}:00`;

      /*
       * The English title and description are optional in the form but
       * required by the API, so an organizer who only wrote Arabic gets the
       * Arabic text stored in both columns. Sending them empty would 422, and
       * sending them blank would leave English-language screens headless.
       */
      const arabicTitle = values.title_ar.trim();
      formData.append("title_ar", arabicTitle);
      formData.append("title_en", values.title_en.trim() || arabicTitle);
      formData.append("description_ar", values.description_ar);
      formData.append(
        "description_en",
        richTextToPlain(values.description_en)
          ? values.description_en
          : values.description_ar
      );
      formData.append("start_date", formattedStartDate);
      formData.append("end_date", formattedEndDate);
      formData.append("format_id", values.learnServeFormat);
      formData.append("participants_needed", values.participantsNeeded);
      formData.append(
        "from_age",
        values.age[0] !== null ? values.age[0].toString() : ""
      );
      formData.append(
        "to_age",
        values.age[1] !== null ? values.age[1].toString() : ""
      );
      formData.append("primary_language", values.primary_language);
      formData.append("start_time", formattedStartTime);
      formData.append("end_time", formattedEndTime);
      // The API's `boolean` validation rule only accepts 1/0 (or "1"/"0"),
      // not the literal strings "true"/"false".
      const isPaidOpportunity = values.is_paid === "true";
      /*
       * BE-77: the four-way audience. The new key is only sent once the
       * backend accepts it — `RejectsUnknownWriteKeys` 422s the whole form
       * otherwise — and `is_kuwaitis` goes alongside it either way, so an
       * older API and an updated one both get an answer they understand.
       */
      const nationality = values.opportunity_nationality as OpportunityNationality;
      if (OPPORTUNITY_NATIONALITY_FIELD_LIVE) {
        formData.append("opportunity_nationality", nationality);
      }
      formData.append(
        "is_kuwaitis",
        opportunityNationalityToLegacyFlag(nationality) ? "1" : "0"
      );
      formData.append("is_paid", isPaidOpportunity ? "1" : "0");
      // Only meaningful when paid. On the free branch the backend nulls the
      // column itself, so sending an empty string would just be noise.
      if (isPaidOpportunity) {
        formData.append("price", values.price);
      }
      formData.append("gender_id", values.gender);

      // Unconditional now that the field is required: the old guard existed so
      // an edit could clear the column, and that path is gone.
      formData.append("due_date", formatDateToYYYYMMDD(values.dueDate));

      values._interests.forEach((interest) => {
        formData.append("interest_ids[]", interest);
      });

      // License image: send a new file, or signal removal, or leave untouched.
      // Republish honours an explicit removal too — the backend's
      // RepublishMedia::apply() nulls the licence before it would clone the
      // source's, so the repost doesn't resurrect a removed document.
      if (values.license_image instanceof File && values.license_image.size > 0) {
        formData.append("license_image", values.license_image);
      } else if (id && values.license_image_removed) {
        formData.append("license_image_removed", "1");
      }

      // Republish media contract (backend RepublishMedia service). A repost
      // never reuses the source's images, so the keep-set is always empty:
      // `existing_image_ids` carries the scalar "none" sentinel that
      // MediaKeepSet::normalizeEmptySignal() turns into an empty array —
      // `existing_image_ids[]` sent zero times has no multipart representation
      // and would read as "keep everything". `opportunity_id` is still sent so
      // RepublishMedia::apply() can copy the LICENCE across; with an empty
      // keep-set it copies no images. Mirrors VolunteerForm.
      if (isRepublish && id) {
        formData.append("opportunity_id", id);
        formData.append("existing_image_ids", "none");
      } else if (id && existingImageIds.length > 0) {
        existingImageIds.forEach((imageId) => {
          formData.append("existing_image_ids[]", imageId.toString());
        });
      }

      // Creation sends `opportunity_images_*`; updates send `new_opportunity_images_*`
      values.opportunity_images.forEach((file, index) => {
        if (!(file instanceof File)) return;
        const prefix = isUpdate
          ? "new_opportunity_images"
          : "opportunity_images";
        formData.append(`${prefix}_${index}`, file);
        formData.append(`${prefix}_is_after_completed_${index}`, "0");
      });

      /*
       * Sponsors belong to a free opportunity only: a sponsor funds something
       * that is free to attend, while a paid one is funded by its
       * participants. The API enforces the read side already — a paid
       * opportunity returns `opportunity_sponsor_images: []` whatever is
       * attached — so this drops them on the write side too, and an
       * opportunity switched from free to paid sheds the sponsors it had
       * rather than keeping them attached invisibly.
       */
      const sponsorIds = isPaidOpportunity
        ? []
        : values.sponsors.map((sponsor) => sponsor.sponsorId).filter(Boolean);

      // BE-65 — the contact belongs to the opportunity, not to its format, so
      // it is sent for in-person and online alike. Empty clears the column:
      // ConvertEmptyStringsToNull turns "" into null server-side, which is what
      // `['nullable', 'url']` expects.
      formData.append("whatsapp_link", values.whatsappLink || "");

      if (values.learnServeFormat === onlineFormatId) {
        formData.append("link", values.meetingLink || "");
      } else {
        formData.append("map_desc", values.location || "");
        formData.append("location_url", values.location_url || "");
        if (values.latitude) formData.append("latitude", values.latitude);
        if (values.longitude) formData.append("longitude", values.longitude);
      }

      /*
       * Only courses and internships grant a certificate — a class/workshop or
       * a consultation must never carry a certificate type. The field is
       * already hidden for those types, but Formik keeps whatever was picked
       * before the type was switched, and an edited opportunity starts from
       * whatever the record already had. Sending an empty value clears the
       * column (Laravel's ConvertEmptyStringsToNull turns it into `null`,
       * which the API accepts), so switching a course to a workshop actually
       * removes its certificate instead of leaving it behind.
       */
      const grantsCertificate =
        (!!internshipTypeId && values.learningType === internshipTypeId) ||
        (!!courseTypeId && values.learningType === courseTypeId);
      formData.append(
        "certificate_type_id",
        grantsCertificate ? values.certificateType || "" : ""
      );
      if (values.learningType) {
        formData.append("learning_type_id", values.learningType);
      }

      if (isUpdate && id && !isRepublish) {
        const { interestsDropped } = await submitToleratingInterestIds(
          formData,
          (payload) =>
            updateOpportunityMutation.mutateAsync({ id, data: payload })
        );
        if (interestsDropped) {
          toast.info(t("COMMON.TOAST.INTEREST_TAGS_NOT_SAVED"));
        }
        if (removedImageIds.length > 0) {
          await deleteOpportunityImage({
            image_ids: removedImageIds,
            type: "learnserve",
          });
        }
        await syncOpportunitySponsors({
          type: "learn-serve",
          opportunityId: id,
          organizationIds: sponsorIds,
          currentSponsors: opportunityData?.opportunity_sponsor_images ?? [],
        });
        toast.success(t("COMMON.TOAST.UPDATE_OPPORTUNITY_SUCCESS"));
        setRemovedImageIds([]);
        router.push(`/learn-share-event-detail/${id}`);
        return;
      }

      const { result: response, interestsDropped } =
        await submitToleratingInterestIds(formData, (payload) =>
          createOpportunityMutation.mutateAsync(payload)
        );
      if (interestsDropped) {
        toast.info(t("COMMON.TOAST.INTEREST_TAGS_NOT_SAVED"));
      }
      if (response?.data?.id) {
        await syncOpportunitySponsors({
          type: "learn-serve",
          opportunityId: String(response.data.id),
          organizationIds: sponsorIds,
        });
        setOpportunityId(response.data.id);
        toast.success(t("COMMON.TOAST.CREATE_OPPURTUNITY_SUCCESS"));

        setOpportunityDetails({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
        });

        helpers.resetForm();
        // The flow is finished, so the resume breadcrumbs can go
        localStorage.removeItem(OPPORTUNITY_ID_KEY);
        localStorage.removeItem(OPPORTUNITY_DETAILS_KEY);
        router.replace("/posting-thankyou");
      }
    } catch (error) {
      reportSubmitError(error, isUpdate);
      throw error; // Re-thrown so the modal handlers can keep themselves open
    }
  };

  const handleSubmit = async (
    values: LearnServeFormValues,
    helpers: FormikHelpers<LearnServeFormValues>
  ) => {
    try {
      // Reposting always creates a new opportunity, even though `id` is set
      await proceedWithSubmission(values, helpers, !!id && !isRepublish);
    } catch {
      // Already surfaced in proceedWithSubmission
    }
  };

  const handleConfirmDeleteTimeSlots = async () => {
    if (!pendingFormData || !id) return;

    try {
      await deleteTimeSlotsMutation.mutateAsync(Number(id));
      toast.success(t("COMMON.TOAST.DELETE_TIMESLOTS_SUCCESS"));

      const { values, helpers } = pendingFormData;
      await proceedWithSubmission(values, helpers, true);

      setConfirmModalOpen(false);
      setPendingFormData(null);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          selectedLanguage,
          t("COMMON.TOAST.DELETE_TIMESLOTS_FAILED")
        )
      );
      // Leave the modal open so the user can retry or cancel
    }
  };

  const handleCancelDeleteTimeSlots = () => {
    setConfirmModalOpen(false);
    setPendingFormData(null);
  };

  const handleUpdateConfirm = async () => {
    if (!pendingFormData) return;

    try {
      const { values, helpers } = pendingFormData;
      await proceedWithSubmission(values, helpers, true);

      setShowUpdateConfirmModal(false);
      setPendingFormData(null);
    } catch (error) {
      console.error("Error in handleUpdateConfirm:", error);
      // Leave the modal open so the user can retry or cancel
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
        if (removedImageId != null) {
          setRemovedImageIds((prev) =>
            prev.includes(removedImageId) ? prev : [...prev, removedImageId]
          );
        }
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
      age: "[name='age[0]']",
      sponsors: ".sponsors",
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

  const handleCloseTimeModal = () => {
    setOpentime(false);
    if (opportunityId) {
      refetchTimeSlots();
    }
  };

  /**
   * Discarding unsaved edits: keep the slots the user actually saved, and
   * restore the rest from the server copy.
   */
  const handleConfirmAction = () => {
    const savedTimeSlots = timeSlots.filter((slot) => slot.isSaved === true);
    const combinedTimeSlots = [...savedTimeSlots];

    if (opportunityData?.timeslots_display) {
      opportunityData.timeslots_display.forEach((displaySlot: TimeSlot) => {
        if (
          !savedTimeSlots.some((savedSlot) => savedSlot.id === displaySlot.id)
        ) {
          combinedTimeSlots.push({ ...displaySlot, isSaved: false });
        }
      });
    }

    try {
      clearTimeSlots();
      setTimeSlots(combinedTimeSlots);
      toast.success(t("COMMON.TOAST.DELETE_TIME_SLOT_SUCCESS"));
    } catch (error) {
      console.error("Error performing action:", error);
      toast.error(t("COMMON.TOAST.DELETE_TIME_SLOT_FAILED"));
    } finally {
      setShowConfirmModal(false);
      setOpen(false);
    }
  };

  const handleTimeSlotModalClose = () => {
    if (areTimeSlotsUnchanged) {
      setOpen(false);
    } else {
      setShowConfirmModal(true);
    }
  };

  // `navState === null` means the stashed payload has not been read yet.
  if (navState === null || isLoadingOpportunity) {
    return <Loader />;
  }

  return (
    <>
      <Modal
        open={opentime && Boolean(opportunityId)}
        onClose={handleCloseTimeModal}
        title={t("COMMON.CREATE_TIMING")}
        size="md"
      >
        {opportunityId ? (
          <CreateTiming
            opportunityId={opportunityId}
            setOpenForm={handleCloseTimeModal}
            refetch={() => {
              if (opportunityId) refetchTimeSlots();
            }}
            startDate={opportunityDetails.startDate}
            endDate={opportunityDetails.endDate}
            startTime={opportunityDetails.startTime}
            endTime={opportunityDetails.endTime}
          />
        ) : (
          <div className="p-4 text-center">
            {t("COMMON.NO_OPPORTUNITY_CREATED")}
          </div>
        )}
      </Modal>

      <Modal
        open={confirmModalOpen}
        onClose={handleCancelDeleteTimeSlots}
        title={t("COMMON.CONFIRM_DELETE_TIMESLOTS")}
        size="sm"
        footer={
          <div className="flex justify-center w-full gap-5">
            <Button
              variant="secondary"
              size="medium"
              onClick={handleCancelDeleteTimeSlots}
            >
              {t("COMMON.CANCEL")}
            </Button>
            <Button
              variant="primary"
              size="medium"
              onClick={handleConfirmDeleteTimeSlots}
            >
              {t("COMMON.CONFIRM")}
            </Button>
          </div>
        }
      >
        <div className="p-4 text-center">
          {t("COMMON.CONFIRM_DELETE_TIMESLOTS_MESSAGE")}
        </div>
      </Modal>

      <Modal
        open={showUpdateConfirmModal}
        onClose={() => {
          setShowUpdateConfirmModal(false);
          setPendingFormData(null);
        }}
        title={t("COMMON.UPDATE_OPPORTUNITY")}
        size="sm"
      >
        {pendingFormData && (
          <UpdateLearnServeConfirmModal
            setOpenModal={() => {
              setShowUpdateConfirmModal(false);
              setPendingFormData(null);
            }}
            onConfirm={handleUpdateConfirm}
            opportunityTitle={
              opportunityData
                ? {
                    title_en: opportunityData.title_en || "",
                    title_ar: opportunityData.title_ar || "",
                  }
                : undefined
            }
          />
        )}
      </Modal>

      <div className="border-t border-[#000] filterpage">
        <div className="2xl:w-[1225px] lg:w-[1100px] md:w-[96%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] mx-auto">
          <h2>
            <Title text={t("COMMON.LEARN.SERVE.FORM")} variant="default" />
          </h2>
          <Formik
            // The tag choices decide which ids the saved interests preselect,
            // so remount once they land as well.
            key={`${formKey}-${tagOptions.length}`}
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            validateOnMount={false}
            validateOnBlur
            validateOnChange
          >
            {({
              setFieldValue,
              values,
              setFieldTouched,
              touched,
              isSubmitting,
              errors,
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

                // Updating an existing opportunity asks for confirmation first
                if (id && !isRepublish) {
                  // Formik's helpers aren't available outside onSubmit, and the
                  // confirm path only ever calls resetForm on create.
                  const noopHelpers = {
                    resetForm: () => {},
                    setErrors: () => {},
                    setFieldError: () => {},
                    setFieldTouched: () => Promise.resolve(),
                    setFieldValue: () => Promise.resolve(),
                    setFormikState: () => {},
                    setStatus: () => {},
                    setSubmitting: () => {},
                    setTouched: () => Promise.resolve(),
                    setValues: () => Promise.resolve(),
                    submitForm: () => Promise.resolve(),
                    validateField: () => Promise.resolve(),
                    validateForm: () => Promise.resolve({}),
                  } as unknown as FormikHelpers<LearnServeFormValues>;

                  setPendingFormData({ values, helpers: noopHelpers });
                  setShowUpdateConfirmModal(true);
                  return;
                }

                submitForm();
              };

              const isInternshipOrCourse =
                (!!internshipTypeId && values.learningType === internshipTypeId) ||
                (!!courseTypeId && values.learningType === courseTypeId);
              const isOnline =
                !!onlineFormatId && values.learnServeFormat === onlineFormatId;
              const isInPerson =
                !!inPersonFormatId &&
                values.learnServeFormat === inPersonFormatId;
              const isPaid = values.is_paid === "true";

              return (
                <>
                  <Modal
                    open={open}
                    onClose={handleTimeSlotModalClose}
                    title={t("COMMON.TIMINGS")}
                    size="md"
                  >
                    <EventTimeSlotModal
                      startDate={values.startDate}
                      disableSaveButton={disableSaveButton}
                      endDate={values.endDate}
                      startTime={values.startTime}
                      endTime={values.endTime}
                      participantsNeeded={Number(values.participantsNeeded)}
                      setOpen={setOpen}
                    />
                  </Modal>

                  <Modal
                    open={opentime && !opportunityId}
                    onClose={() => setOpentime(false)}
                    title={t("COMMON.CREATE_TIMING")}
                    size="md"
                  >
                    <EventCreateTimingModal
                      setOpenForm={() => setOpentime(false)}
                      startDate={values.startDate}
                      endDate={values.endDate}
                      startTime={values.startTime}
                      endTime={values.endTime}
                      participantsNeeded={Number(values.participantsNeeded)}
                    />
                  </Modal>

                  <Modal
                    open={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    title={t("COMMON.PROCEED_WITHOUT_SAVING_TITLE")}
                    size="sm"
                    footer={
                      <div className="flex xss:flex-col justify-center w-full gap-5">
                        <Button
                          variant="primary"
                          size="medium"
                          className="xss:!w-full"
                          onClick={handleConfirmAction}
                        >
                          {t("COMMON.CONFIRM")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="medium"
                          className="xss:!w-full"
                          onClick={() => setShowConfirmModal(false)}
                        >
                          {t("COMMON.CANCEL")}
                        </Button>
                      </div>
                    }
                  >
                    <h2 className="text-center pb-10 text-lg">
                      {t("COMMON.PROCEED_WITHOUT_SAVING")}
                    </h2>
                  </Modal>

                  <Form className="selectfiled">
                    <LearnServeFormEffects
                      values={values}
                      touched={touched as Record<string, unknown>}
                      validateForm={validateForm}
                      setFieldValue={setFieldValue}
                      opportunityData={opportunityData}
                      id={id}
                      selectedLanguage={selectedLanguage}
                      timeSlotModalOpen={open}
                      setInitialTimeSlots={setInitialTimeSlots}
                      skipNextGeocodeRef={skipNextGeocodeRef}
                    />

                    {/*
                      One four-column grid for the short fields, replacing the
                      stack of flex rows this form used to be — the same grid
                      `VolunteerForm` uses, and the order the client's mockup
                      shows:
                        1. title · type · format · participants needed
                        2. due date · start date · end date · time from/to
                        3. age · gender · meeting link · WhatsApp contact
                        4. paid-or-free · price · certificate · nationality
                      The pairs that read as one answer — age from/to and time
                      from/to — each occupy a single column, which is what keeps
                      the rows four wide. "Where" sits below the grid rather
                      than in it, because the map picker is far taller than a
                      field and would set the height of its whole row.
                    */}
                    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2 lg:grid-cols-4">
                      {/* ---- Row 1: what it is ---- */}
                      <div>
                        <Input
                          name="title_ar"
                          label={t("COMMON.ENTER_TITLE_AR")}
                          type="text"
                          maxLength={400}
                          dir="rtl"
                          onFocus={() => setFieldTouched("title_ar", true)}
                        />
                        {showEnglishTitle && (
                          <Input
                            name="title_en"
                            label={t("COMMON.ENTER_TITLE_EN")}
                            type="text"
                            maxLength={400}
                            dir="ltr"
                            onFocus={() => setFieldTouched("title_en", true)}
                          />
                        )}
                        <button
                          type="button"
                          className="-mt-2 mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                          onClick={() => {
                            if (showEnglishTitle) {
                              // Clear as well as close, so a value typed and
                              // then dismissed can't be submitted invisibly.
                              setFieldValue("title_en", "");
                              setFieldTouched("title_en", false);
                            }
                            setEnglishTitleToggle(!showEnglishTitle);
                          }}
                        >
                          {showEnglishTitle ? (
                            <FaMinus className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <FaPlus className="h-3 w-3" aria-hidden="true" />
                          )}
                          {t(
                            showEnglishTitle
                              ? "COMMON.REMOVE_ENGLISH_TITLE"
                              : "COMMON.ADD_ENGLISH_TITLE"
                          )}
                        </button>
                      </div>

                      <SelectInput
                        name="learningType"
                        label={t("COMMON.TYPE")}
                        options={learningTypeOptions}
                        onChange={(selectedOption) =>
                          setFieldValue(
                            "learningType",
                            selectedOption?.value || ""
                          )
                        }
                        // The type is fixed once an opportunity is reposted
                        disabled={learningTypeLoading}
                      />

                      <SelectInput
                        name="learnServeFormat"
                        label={t("COMMON.FORMAT")}
                        options={learnServeFormatOptions}
                        onChange={(selectedOption) => {
                          const selectedId = selectedOption?.value || "";
                          setFieldValue("learnServeFormat", selectedId);
                          // Switching format clears the field that no longer applies
                          if (selectedId === inPersonFormatId) {
                            setFieldValue("meetingLink", "");
                            setFieldTouched("meetingLink", false);
                          } else if (selectedId === onlineFormatId) {
                            setFieldValue("location", "");
                            setFieldTouched("location", false);
                          }
                        }}
                        disabled={learnServeFormatLoading}
                      />

                      <Input
                        name="participantsNeeded"
                        label={t("COMMON.PARTICIPANTS_NEEDED")}
                        type="text"
                      />

                      {/* ---- Row 2: when it runs ---- */}
                      <DatePickerInput
                        name="dueDate"
                        label={t("COMMON.DUE_DATE")}
                        rmdpClassname="placeholder-primary-5"
                        minDate={new Date()}
                        showDueDate
                      />
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
                      <div className="flex gap-2">
                        <Field name="startTime">
                          {({
                            field,
                          }: FieldProps<string, LearnServeFormValues>) => (
                            <TimepickerInput
                              label={t("COMMON.START_TIME")}
                              className="w-full"
                              autoSetTime={autoSetTimeOnClick}
                              {...field}
                            />
                          )}
                        </Field>
                        <Field name="endTime">
                          {({
                            field,
                          }: FieldProps<string, LearnServeFormValues>) => (
                            <TimepickerInput
                              label={t("COMMON.END_TIME")}
                              className="w-full"
                              autoSetTime={autoSetTimeOnClick}
                              {...field}
                            />
                          )}
                        </Field>
                      </div>

                      {/* ---- Row 3: who it is for, and how to reach it ---- */}
                      <AgeRange name="age" label={t("COMMON.AGE")} />
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
                        name="meetingLink"
                        label={t("COMMON.MEETING.LINK")}
                        type="text"
                        disabled={isInPerson}
                      />
                      {/*
                        BE-65 — the opportunity's own WhatsApp contact, and not
                        the same thing as the meeting link beside it: this one
                        is shown to everyone, while the meeting link is revealed
                        only to registered participants. Optional, and never
                        disabled — an in-person opportunity wants a contact just
                        as much.
                      */}
                      <Input
                        name="whatsappLink"
                        label={t("COMMON.WHATSAPP_LINK")}
                        type="text"
                      />

                      {/* ---- Row 4: terms ---- */}
                      {/*
                        Was a checkbox. A select states both answers on screen,
                        which a lone unchecked box does not — "free" was only
                        ever implied by the absence of a tick. Unlike the
                        certificate and nationality fields below it, this one
                        applies to every learn-and-serve format.
                      */}
                      <SelectInput
                        name="is_paid"
                        label={t("COMMON.PAID_OR_FREE")}
                        options={[
                          {
                            label: t("COMMON.FREE_OPPORTUNITY"),
                            value: "false",
                          },
                          {
                            label: t("COMMON.PAID_OPPORTUNITY"),
                            value: "true",
                          },
                        ]}
                        onChange={(selectedOption) => {
                          const nextIsPaid = selectedOption?.value === "true";
                          setFieldValue("is_paid", String(nextIsPaid));
                          if (!nextIsPaid) {
                            // Clear as well as hide: a price left behind a
                            // collapsed field would still be validated.
                            setFieldValue("price", "");
                            setFieldTouched("price", false);
                          }
                        }}
                      />

                      {isPaid && (
                        <div>
                          <Input
                            name="price"
                            label={`${t("COMMON.PRICE")} (${t(
                              "COMMON.CURRENCY_KWD"
                            )})`}
                            type="text"
                            onFocus={() => setFieldTouched("price", true)}
                          />
                          {/* Live on both paths now — see `platformFeePercent`. */}
                          <p className="-mt-2 mb-4 text-xs text-secondary-102">
                            {t("COMMON.PLATFORM_FEE_HINT", {
                              percent: platformFeePercent,
                            })}
                          </p>
                        </div>
                      )}

                      {/* Certificates and nationality only apply to
                          internships and courses */}
                      {isInternshipOrCourse && (
                        <div>
                          <SelectInput
                            name="certificateType"
                            label={t("COMMON.CERTIFICATE")}
                            options={certificateTypeOptions}
                            onChange={(selectedOption) =>
                              setFieldValue(
                                "certificateType",
                                selectedOption?.value || ""
                              )
                            }
                            disabled={certificateTypeLoading}
                          />
                          {values.certificateType === forsaCertificateId && (
                            <div className="-mt-2 mb-4 flex items-center">
                              <a
                                href="/certificate"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border-b border-primary-5 text-sm font-bold text-primary-5"
                              >
                                {t("COMMON.PREVIEW.CERTIFICATE")}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/*
                        Was a "Kuwaitis only" checkbox, then a two-way select.
                        Now the client's four-way audience (BE-77): «الجميع»
                        plus the three groups that partition everyone.
                      */}
                      {isInternshipOrCourse && (
                        <SelectInput
                          name="opportunity_nationality"
                          label={t("COMMON.OPPORTUNITY_NATIONALITY")}
                          options={opportunityNationalityOptions.map(
                            (option) => ({
                              label:
                                selectedLanguage === "ar"
                                  ? option.name_ar
                                  : option.name_en,
                              value: option.value,
                            })
                          )}
                          onChange={(selectedOption) =>
                            setFieldValue(
                              "opportunity_nationality",
                              String(selectedOption?.value ?? "all")
                            )
                          }
                        />
                      )}
                    </div>

                    {/*
                      Two ways to answer one question, so only one is on screen
                      at a time — the same pair `VolunteerForm` offers.
                      Switching clears the side being hidden: an organiser who
                      pins the map after pasting a link has changed their
                      answer, and leaving the link behind would submit a
                      location they can no longer see or correct.

                      The whole block is hidden for an online opportunity, which
                      has no physical location to give.
                    */}
                    {!isOnline &&
                      (showMapPicker ? (
                        <>
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
                              // A map pick is always authoritative for the
                              // location text — overwrite whatever was there.
                              const address = await fetchAddress(
                                Number(lat),
                                Number(lng),
                                selectedLanguage
                              );
                              skipNextGeocodeRef.current = true;
                              setFieldValue("location", address);
                            }}
                          />
                          <button
                            type="button"
                            className="-mt-2 mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                            onClick={() => {
                              setFieldValue("location", "");
                              setFieldValue("latitude", "");
                              setFieldValue("longitude", "");
                              setFieldTouched("location", false);
                              setMapPickerToggle(false);
                            }}
                          >
                            <FaLink className="h-3 w-3" aria-hidden="true" />
                            {t("COMMON.USE_LOCATION_LINK")}
                          </button>
                        </>
                      ) : (
                        <>
                          <Input
                            name="location_url"
                            label={t("COMMON.LOCATION_URL")}
                            placeholder={t("COMMON.LOCATION_URL_PLACEHOLDER")}
                            dir="ltr"
                            onFocus={() => setFieldTouched("location_url", true)}
                          />
                          <button
                            type="button"
                            className="-mt-2 mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                            onClick={() => {
                              setFieldValue("location_url", "");
                              setFieldTouched("location_url", false);
                              setMapPickerToggle(true);
                            }}
                          >
                            <FaMapMarkerAlt
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            {t("COMMON.SELECT_FROM_MAPS")}
                          </button>
                        </>
                      ))}

                    <div className="descritpionitm descritpionitm-ar">
                      <Field
                        name="description_ar"
                        label={t("COMMON.DESCRIPTION_AR")}
                        placeholder={t("COMMON.DESCRIPTION_AR")}
                        component={RichTextEditor}
                        language="ar"
                      />
                    </div>

                    {!showEnglishDescription && (
                      <button
                        type="button"
                        className="mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                        onClick={() => setEnglishDescriptionToggle(true)}
                      >
                        <FaPlus className="h-3 w-3" aria-hidden="true" />
                        {t("COMMON.ADD_ENGLISH_DESCRIPTION")}
                      </button>
                    )}

                    {showEnglishDescription && (
                      <>
                        <div className="descritpionitm descritpionitm-en">
                          <Field
                            name="description_en"
                            label={t("COMMON.DESCRIPTION_EN")}
                            placeholder={t("COMMON.DESCRIPTION_EN")}
                            component={RichTextEditor}
                            language="en"
                          />
                        </div>
                        <button
                          type="button"
                          className="mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                          onClick={() => {
                            // Clear as well as close, so an editor left holding
                            // `<p></p>` (or real text) can't be submitted from
                            // behind a collapsed panel.
                            setFieldValue("description_en", "");
                            setFieldTouched("description_en", false);
                            setEnglishDescriptionToggle(false);
                          }}
                        >
                          <FaMinus className="h-3 w-3" aria-hidden="true" />
                          {t("COMMON.REMOVE_ENGLISH_DESCRIPTION")}
                        </button>
                      </>
                    )}

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

                    {/*
                      A sponsor funds an opportunity that is free to attend; a
                      paid one is funded by its participants, so naming a
                      sponsor on it credits them for something they did not pay
                      for. The API agrees on the read side —
                      `opportunity_sponsor_images` comes back `[]` for a paid
                      opportunity whatever is attached — and the submit drops
                      them on the write side.
                    */}
                    {!isPaid && (
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
                                        i !== index &&
                                        s.sponsorId === option.value
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
                    )}

                    <div className="pb-4">
                      <UploadDocument
                        name="opportunity_images"
                        label={t("COMMON.UPLOAD_IMAGE")}
                        accept="image/jpeg, image/png"
                        multiple
                        /* One image per opportunity — the picker, the previews and the
                           submitted array are all capped at one. `multiple` stays so the
                           value keeps its array shape; `singleFileArray` is the cap. */
                        singleFileArray
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
                        cropAspectRatio={4 / 5}
                        cropShape="rect"
                        cropDisplayMode="opportunity"
                        cropWidth={600}
                        cropHeight={750} // 4:5, Instagram portrait — matches the cards
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
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => {
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

                    <div className="flex justify-center gap-4 2xl:pt-[70px] laptopmain:2xl:pt-[40px] laptop:pt-[40px] pt-[40px]">
                      <DisabledButtonWithTooltip
                        type="button"
                        variant="primary"
                        size="medium"
                        tooltipText=""
                        disabled={submitLoading || updateLoading || isSubmitting}
                        showTooltip={false}
                        onClick={handleFormSubmit}
                        className="disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {id && !isRepublish
                          ? t("COMMON.SAVE")
                          : isRepublish
                            ? t("COMMON.REPOST")
                            : t("COMMON.PUBLISH")}
                      </DisabledButtonWithTooltip>
                    </div>
                  </Form>
                </>
              );
            }}
          </Formik>
        </div>
      </div>
    </>
  );
}
