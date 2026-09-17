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
import OpportunityScheduleDates, {
  toFormDateValue,
  type ScheduleMode,
} from "@/features/opportunities/components/OpportunityScheduleDates";
import { getDropdownChoicesRequest } from "@/features/auth/services/authApi";
import { checkLicenseRequirement, createVolunteerOpportunity, deleteOpportunityImage, getOpportunityById, syncOpportunitySponsors, updateVolunteerOpportunity } from "@/features/opportunities/services/opportunities";
import { getAllOrganizations } from "@/features/shared/services/directory";
import { submitToleratingInterestIds } from "@/features/shared/interestIdsFallback";
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
  /**
   * Both modes keep these populated — the first and last day the opportunity
   * runs — so every existing date rule, sort and card keeps working. What
   * separates the two is `scheduleDates`. See `OpportunityScheduleDates`.
   */
  startDate: string;
  endDate: string;
  scheduleMode: ScheduleMode;
  scheduleDates: string[];
  participantsNeeded: string;
  age: [number | null, number | null];
  startTime: string;
  endTime: string;
  volunteerHoursPerDay: string;
  gender: string;
  location: string;
  /** A shared maps URL — the quick path, and the one most organisers use. */
  locationUrl: string;
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
 * Visible text inside a rich-text value. The editor never returns an empty
 * string once it has been focused — it leaves `<p></p>` or `<p><br></p>`
 * behind — so "is there a description?" has to be asked of the text, not of
 * the markup.
 */
const richTextToPlain = (value?: string | null): string =>
  (value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

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
  const [pendingSponsorIds, setPendingSponsorIds] = useState<string[]>([]);
  const [roleModalRef, setRoleModalRef] = useState<{
    checkParticipantsMismatch: () => boolean;
  } | null>(null);

  const [formKey, setFormKey] = useState(0);
  const [showOpportunitySection] = useState(!isVolunteer);

  /*
   * The title is asked for once, in Arabic. English is an optional extra the
   * organizer opens only if they want a different wording — when they don't,
   * the submit handler sends the Arabic title in both fields, because the API
   * requires `title_en` and a record with an empty one renders as a blank
   * heading on every English-language screen.
   *
   * `null` means "the organizer hasn't decided", which lets the panel follow
   * the record: open when editing an opportunity that already carries a
   * genuinely different English title, closed otherwise. Once they click
   * either way, their choice wins. Resolved against `opportunityData` further
   * down, where it is in scope.
   */
  const [englishTitleToggle, setEnglishTitleToggle] = useState<boolean | null>(
    null
  );
  /** The description asks the same question, and answers it the same way. */
  const [englishDescriptionToggle, setEnglishDescriptionToggle] = useState<
    boolean | null
  >(null);

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

  /*
   * Only a *different* English title counts as one the organizer wrote. An
   * opportunity created through this form without opening the English panel
   * stores the Arabic title in both columns, so treating any non-empty
   * `title_en` as deliberate would re-open the panel on every edit and show
   * the Arabic text in a field labelled English.
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

  /*
   * `time_slots` is how the API records a non-consecutive schedule: one row
   * per day the opportunity actually runs. Its presence is therefore the only
   * reliable signal that the organiser chose scattered days — `start_date` and
   * `end_date` look identical either way, since they are the first and last
   * day in both modes.
   */
  const storedScheduleDates: string[] = useMemo(() => {
    const slots = opportunityData?.time_slots;
    if (!Array.isArray(slots) || slots.length === 0) {
      return [
        opportunityData?.start_date,
        opportunityData?.end_date,
        // A single-day opportunity stores the same date twice; dedupe so the
        // range picker doesn't open with a phantom second selection.
      ]
        .filter((day: unknown): day is string => typeof day === "string" && !!day)
        .map((day) => day.slice(0, 10))
        .filter((day, index, all) => all.indexOf(day) === index);
    }
    return [
      ...new Set(
        slots
          .map((slot: { date?: string }) => slot?.date?.slice(0, 10))
          .filter((day: string | undefined): day is string => Boolean(day))
      ),
    ].sort();
  }, [opportunityData?.time_slots, opportunityData?.start_date, opportunityData?.end_date]);

  const storedScheduleMode: ScheduleMode = Array.isArray(
    opportunityData?.time_slots
  )
    ? opportunityData.time_slots.length > 0
      ? "scattered"
      : "consecutive"
    : "consecutive";

  /*
   * The map search and picker are the second way to answer "where", kept out
   * of sight until asked for so the common case — paste a maps link — is a
   * single field. Same tri-state as the English title: `null` means the
   * organiser hasn't chosen, so an opportunity already pinned on the map opens
   * with the picker showing rather than hiding the answer it already has.
   */
  const [mapPickerToggle, setMapPickerToggle] = useState<boolean | null>(null);
  const hasStoredMapLocation = Boolean(
    opportunityData?.latitude && opportunityData?.longitude
  );
  const showMapPicker = mapPickerToggle ?? hasStoredMapLocation;

  /*
   * Row 1 of the grid has two optional cells — the English title, and the
   * public/private choice that only organizations see. CSS grid flows the next
   * item into any gap they leave, so without this the due date would slide up
   * into row 1 and every row below would be off by one. Widening the title
   * absorbs whatever is missing and keeps the row exactly four columns.
   *
   * Written out as whole class names on purpose: Tailwind scans the source for
   * literals, so an interpolated `lg:col-span-${n}` would never be generated.
   */
  const titleColSpanClass = [
    "lg:col-span-1",
    "lg:col-span-2",
    "lg:col-span-3",
  ][2 - (showEnglishTitle ? 1 : 0) - (showOpportunitySection ? 1 : 0)];

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
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);

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
      ...(opportunityData.is_kuwaitis ? ["kuwaitis"] : []),
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
    /*
     * A mirrored English title is loaded as empty, not as the Arabic text it
     * copies. Otherwise editing only the Arabic title on such a record would
     * leave the previous wording sitting in `title_en` — visible to nobody on
     * this screen, since the panel stays closed, but served to every
     * English-language visitor afterwards.
     */
    title_en: hasDistinctEnglishTitle ? opportunityData?.title_en || "" : "",
    dueDate: opportunityData?.due_date || "",
    // Derived from the same array the calendar writes, and in the same local
    // midnight ISO form, so a record loaded for editing and one just picked
    // behave identically — see `toFormDateValue`.
    startDate: toFormDateValue(storedScheduleDates[0]),
    endDate: toFormDateValue(storedScheduleDates[storedScheduleDates.length - 1]),
    scheduleMode: storedScheduleMode,
    scheduleDates: storedScheduleDates,
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
    /*
     * The API resource falls `location_url` back to `link` (the WhatsApp
     * number) when the column is empty, so an empty column arrives looking
     * like a maps link. Reading it back verbatim would copy the WhatsApp URL
     * into the location field on every edit, so the fallback is undone here.
     */
    locationUrl:
      opportunityData?.location_url &&
      opportunityData.location_url !== opportunityData?.link
        ? opportunityData.location_url
        : "",
    link: opportunityData?.link || "",
    description_ar: opportunityData?.description_ar || "",
    // Mirrored English loads as empty, not as the Arabic it copies — same
    // reasoning as `title_en` above.
    description_en: hasDistinctEnglishDescription
      ? opportunityData?.description_en || ""
      : "",
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

  // The Arabic description — the one always on screen, and always required.
  const descriptionSchema = Yup.string()
    .concat(YupRequiredString)
    .test(
      "is-not-empty-html",
      i18n.t("COMMON.REQUIRED.FIELD"),
      (value) => richTextToPlain(value).length > 0
    )
    .test(
      "description-min-length",
      i18n.t("COMMON.DESCRIPTION_MIN_LENGTH"),
      (value) => {
        const textContent = richTextToPlain(value);
        // Emptiness is the required rule's business, not this one's.
        return textContent.length === 0 || textContent.length >= 10;
      }
    );

  /*
   * The English description is optional, so it cannot reuse the rule above —
   * that one is built on `YupRequiredString`. The length floor still applies
   * to anything actually written, which is the part worth keeping: a
   * two-word English description is worse than none, because the submit
   * handler would otherwise have copied the full Arabic one across.
   */
  const optionalDescriptionSchema = Yup.string().test(
    "description-min-length",
    i18n.t("COMMON.DESCRIPTION_MIN_LENGTH"),
    (value) => {
      const textContent = richTextToPlain(value);
      return textContent.length === 0 || textContent.length >= 10;
    }
  );

  const validationSchema = Yup.object({
    /*
     * Required, and deliberately so. The submit handler maps anything that is
     * not the literal "public" to `is_public: 0`, so leaving this untouched
     * used to create a PRIVATE opportunity silently — it never appeared in any
     * listing, and the backend additionally refuses registrations for private
     * opportunities, so it was both invisible and unjoinable with no signal to
     * the organizer. Defaulting the other way would be just as wrong (an
     * opportunity meant to be private would go public), so the choice is
     * forced instead. Only organizations see the field; volunteers always send
     * `is_public: 1`, which is why this is conditional.
     */
    isPrivate: showOpportunitySection
      ? Yup.string().concat(YupRequiredString)
      : Yup.string().notRequired(),
    title_ar: YupStringMaxLength(400)
      .min(2, () => i18n.t("COMMON.EVENT_TITLE_MIN_LENGTH"))
      .concat(YupRequiredString),
    /*
     * Optional, and built from scratch rather than from `YupStringMaxLength` —
     * that helper descends from `YupRequiredString`, so every rule composed
     * out of it is required no matter what is chained on afterwards. The
     * length and whitespace rules still apply to whatever is actually typed;
     * `excludeEmptyString` keeps them off an untouched field.
     */
    title_en: Yup.string()
      .max(
        400,
        () =>
          `${i18n.t("COMMON.MUST.BE.ATMOST")}400${i18n.t("COMMON.CHARACTERS")}`
      )
      .matches(/^(?!\s)/, {
        message: () => i18n.t("COMMON.NO.START.SPACE"),
        excludeEmptyString: true,
      })
      .matches(/(?<!\s)$/, {
        message: () => i18n.t("COMMON.NO.END.SPACE"),
        excludeEmptyString: true,
      })
      .test(
        "title-en-min-length",
        () => i18n.t("COMMON.EVENT_TITLE_MIN_LENGTH"),
        (value) => !value || value.trim().length >= 2
      ),
    /*
     * Optional. Left empty, the opportunity keeps accepting volunteers until
     * its last day — the backend's own fallback
     * (`HasRegistrationWindow::registrationClosesAt()` uses `end_date` when
     * `due_date` is null), so nothing has to be sent in its place.
     *
     * Both tests below already pass on an empty value, so dropping the
     * required rule is all that is needed: a deadline that *is* given still has
     * to be in the future and still has to fall before the first day.
     */
    dueDate: Yup.string()
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
    /*
     * `startDate` / `endDate` already carry the future and ordering rules, and
     * they are derived from this array, so all this has to catch is an empty
     * calendar — which in scattered mode is otherwise invisible, since there
     * is no separate end-date field left for the organiser to notice missing.
     */
    scheduleDates: Yup.array()
      .of(Yup.string())
      .min(1, () => i18n.t("COMMON.REQUIRED.FIELD")),
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
    /*
     * There are two ways to answer "where": paste a maps link, or pick the
     * spot on the map. Either is enough, so **neither** field can be required
     * on its own — the rule is "at least one", checked from both sides.
     *
     * Both use `.test` rather than `Yup.when`, which would make the two fields
     * reference each other and throw a cyclic-dependency error at schema build
     * time.
     */
    locationUrl: Yup.string()
      .url(() => i18n.t("COMMON.INVALID_URL"))
      .test(
        "location-provided",
        () => i18n.t("COMMON.LOCATION_REQUIRED"),
        function (value) {
          return Boolean(value?.trim() || this.parent.location?.trim());
        }
      ),
    location: Yup.string()
      /*
       * The same "at least one" rule as above, repeated here on purpose: only
       * one of the two fields is on screen at a time, and an error attached to
       * the hidden one would never be seen. Whichever is visible shows it.
       */
      .test(
        "location-provided",
        () => i18n.t("COMMON.LOCATION_REQUIRED"),
        function (value) {
          return Boolean(value?.trim() || this.parent.locationUrl?.trim());
        }
      )
      .test("has-coordinates", t("COMMON.INVALID_ADDRESS"), function (value) {
        // Nothing to validate when the organiser answered with a link instead.
        if (!value?.trim()) return true;
        const { latitude, longitude } = this.parent;
        return Boolean(latitude) || Boolean(longitude);
      }),
    link: YupWhatsAppLink.concat(YupRequiredString),
    description_ar: descriptionSchema,
    description_en: optionalDescriptionSchema,
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
        is_kuwaitis: selectedCheckBoxes.includes("kuwaitis"),
        is_urgent: selectedCheckBoxes.includes("urgent"),
        // Emergency priority is independent of the "Outside Kuwait"
        // (`is_relief`) classification — it only drives the badge and the
        // top-of-list ordering the API applies.
        is_emergency: selectedCheckBoxes.includes("emergency"),
        is_supports_disabled: selectedCheckBoxes.includes("disabled"),
      };

      const formData = new FormData();

      // The English title is optional in the form but required by the API, so
      // an organizer who only wrote Arabic gets the Arabic title stored in
      // both columns. Sending an empty `title_en` instead would 422, and
      // sending a blank one would leave English-language screens headless.
      const arabicTitle = values.title_ar.trim();
      const englishTitle = values.title_en.trim() || arabicTitle;

      formData.append("title_ar", arabicTitle);
      formData.append("title_en", englishTitle);
      // Same rule as the title: the API requires both, so an organiser who
      // only wrote Arabic gets it stored in both columns rather than leaving
      // English-language visitors with an empty description.
      formData.append("description_ar", values.description_ar);
      formData.append(
        "description_en",
        richTextToPlain(values.description_en)
          ? values.description_en
          : values.description_ar
      );
      // Sent even when empty, on purpose: the key has to be present for an
      // edit that *removes* a deadline to reach the server. An empty string
      // nulls the column, which is what reopens registration to the end date.
      formData.append("due_date", values.dueDate);
      formData.append("start_date", formatDateToYYYYMMDD(values.startDate));
      formData.append("end_date", formatDateToYYYYMMDD(values.endDate));

      /*
       * `time_slots` is the API's per-day schedule: with rows present only the
       * listed days count as running days, without them the whole
       * start_date..end_date range does. So scattered days send one row per
       * selected day, and consecutive days must actively send an empty value —
       * omitting the key entirely leaves a previously scattered schedule in
       * place, and the opportunity would keep running on days the organiser
       * has just replaced with a range.
       */
      if (values.scheduleMode === "scattered") {
        values.scheduleDates.forEach((day, index) => {
          formData.append(`time_slots[${index}][date]`, day);
          formData.append(`time_slots[${index}][start_time]`, values.startTime);
          formData.append(`time_slots[${index}][end_time]`, values.endTime);
        });
      } else {
        formData.append("time_slots", "");
      }

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
      formData.append("gender_id", values.gender);
      formData.append(
        "is_public",
        showOpportunitySection
          ? values.isPrivate === "public"
            ? "1"
            : "0"
          : "1"
      );
      formData.append("map_desc", values.location);
      // Collected again: a pasted maps link is now the primary way to answer
      // "where", with the picker as the alternative. Sent even when empty so
      // an edit that swaps a link for a map pick clears the old one.
      formData.append("location_url", values.locationUrl.trim());
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
        formData.append("interest_ids[]", interest);
      });

      // Republish media contract (backend RepublishMedia service): the source
      // id is sent when the keep-set is non-empty — `existing_image_ids[]`
      // without it 422s with "A source is required to copy images", and
      // `opportunity_id` without a keep-set clones the source's ENTIRE gallery.
      // A keep-everything repost is expressed by sending both; removing every
      // image falls back to a plain create with no media copy.
      if (isRepublish && id && existingImageIds.length > 0) {
        formData.append("opportunity_id", id);
      }

      // Only send existing_image_ids for images with is_after_completed === false
      if (id && existingImageIds.length > 0) {
        existingImageIds.forEach((imageId) => {
          formData.append("existing_image_ids[]", imageId.toString());
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

      // License image: send a new file, or signal removal, or leave untouched.
      // Republish honours an explicit removal too — the backend's
      // RepublishMedia::apply() nulls the licence before it would clone the
      // source's, so the repost doesn't resurrect a removed document.
      if (values.license_image instanceof File && values.license_image.size > 0) {
        formData.append("license_image", values.license_image);
      } else if (id && values.license_image_removed) {
        formData.append("license_image_removed", "1");
      }

      const sponsorIds = values.sponsors
        .map((sponsor) => sponsor.sponsorId)
        .filter(Boolean);

      if (id && !isRepublish) {
        // Show confirmation modal for update
        setPendingFormData(formData);
        setPendingSponsorIds(sponsorIds);
        setShowUpdateConfirmModal(true);
      } else {
        // Create new opportunity, then open the role editor for it
        const { result: response, interestsDropped } =
          await submitToleratingInterestIds(formData, (payload) =>
            createOpportunityMutation.mutateAsync(payload)
          );
        if (interestsDropped) {
          toast.info(t("COMMON.TOAST.INTEREST_TAGS_NOT_SAVED"));
        }
        const responseOpportunityId = response?.data?.id;
        if (responseOpportunityId != null) {
          await syncOpportunitySponsors({
            type: "volunteer",
            opportunityId: String(responseOpportunityId),
            organizationIds: sponsorIds,
          });
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
      const { interestsDropped } = await submitToleratingInterestIds(
        pendingFormData,
        (payload) => updateOpportunityMutation.mutateAsync({ id, data: payload })
      );
      if (interestsDropped) {
        toast.info(t("COMMON.TOAST.INTEREST_TAGS_NOT_SAVED"));
      }
      if (removedImageIds.length > 0) {
        await deleteOpportunityImage({
          image_ids: removedImageIds,
          type: "volunteer",
        });
      }
      await syncOpportunitySponsors({
        type: "volunteer",
        opportunityId: id,
        organizationIds: pendingSponsorIds,
        currentSponsors: opportunityData?.opportunity_sponsor_images ?? [],
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
      setPendingSponsorIds([]);
      setRemovedImageIds([]);
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
      // All three live in the one schedule field, which renders no input
      // carrying their names.
      startDate: "#scheduleDates",
      endDate: "#scheduleDates",
      scheduleDates: "#scheduleDates",
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
                  {/*
                    * One grid for the whole header block rather than a stack
                    * of independent flex rows. Three flex rows each divided
                    * the width by however many fields they happened to hold,
                    * so a 3-field row and a 5-field row produced completely
                    * different column edges and the longer labels were
                    * squeezed until they truncated. A fixed four-column grid
                    * gives every field the same width on every row.
                    *
                    * The two pairs that read as one answer — age from/to and
                    * time from/to — each occupy a single column, which is what
                    * makes all three rows come out to exactly four columns.
                    */}
                  <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* ---- Row 1: what it is ---- */}
                    <div className={titleColSpanClass}>
                      <Input
                        name="title_ar"
                        label={t("COMMON.ENTER_TITLE")}
                        type="text"
                        maxLength={400}
                        dir="rtl"
                        onFocus={() => setFieldTouched("title_ar", true)}
                      />
                      {!showEnglishTitle && (
                        <button
                          type="button"
                          className="-mt-2 mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                          onClick={() => setEnglishTitleToggle(true)}
                        >
                          <FaPlus className="h-3 w-3" aria-hidden="true" />
                          {t("COMMON.ADD_ENGLISH_TITLE")}
                        </button>
                      )}
                    </div>

                    {showEnglishTitle && (
                      <div>
                        <Input
                          name="title_en"
                          label={t("COMMON.ENTER_TITLE_EN")}
                          type="text"
                          maxLength={400}
                          dir="ltr"
                          onFocus={() => setFieldTouched("title_en", true)}
                        />
                        <button
                          type="button"
                          className="-mt-2 mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                          onClick={() => {
                            // Clear as well as close, so a value typed and
                            // then dismissed can't be submitted invisibly.
                            setFieldValue("title_en", "");
                            setFieldTouched("title_en", false);
                            setEnglishTitleToggle(false);
                          }}
                        >
                          <FaMinus className="h-3 w-3" aria-hidden="true" />
                          {t("COMMON.REMOVE_ENGLISH_TITLE")}
                        </button>
                      </div>
                    )}

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

                    {/* ---- Row 2: when it runs ---- */}
                    <DatePickerInput
                      name="dueDate"
                      label={t("COMMON.DUE_DATE_OPTIONAL")}
                      rmdpClassname="placeholder-primary-5"
                      minDate={new Date()}
                      showDueDate
                      clearable
                      showFormatHint={false}
                    />
                    <OpportunityScheduleDates minDate={new Date()} />
                    <div className="flex gap-2">
                      <Field name="startTime">
                        {({
                          field,
                        }: FieldProps<string, VolunteerFormValues>) => (
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
                        }: FieldProps<string, VolunteerFormValues>) => (
                          <TimepickerInput
                            label={t("COMMON.END_TIME")}
                            className="w-full"
                            autoSetTime={autoSetTimeOnClick}
                            {...field}
                          />
                        )}
                      </Field>
                    </div>
                    <Input
                      name="participantsNeeded"
                      label={t("COMMON.PARTICIPANTS_NEEDED")}
                      type="text"
                      onFocus={() => setFieldTouched("participantsNeeded", true)}
                    />

                    {/* ---- Row 3: who it is for ---- */}
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
                      name="link"
                      label={t("COMMON.WHATSAPP_LINK")}
                      className="w-full"
                      onFocus={() => setFieldTouched("link", true)}
                    />
                    {/*
                      * Charity work is the only category the backend keeps a
                      * beneficiaries count for — it nulls the column for every
                      * other one — so the field appears with the category
                      * rather than always, leaving the fourth column empty.
                      */}
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

                  {/*
                    * Two ways to answer one question, so only one is on screen
                    * at a time. Switching clears the side being hidden: an
                    * organiser who pins the map after pasting a link has
                    * changed their answer, and leaving the link behind would
                    * submit a location they can no longer see or correct.
                    */}
                  {showMapPicker ? (
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
                          // A map pick is always authoritative for the location
                          // text — overwrite whatever was there (typed or a
                          // previous pick), not just when the field was empty.
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
                        name="locationUrl"
                        label={t("COMMON.LOCATION_URL")}
                        dir="ltr"
                        onFocus={() => setFieldTouched("locationUrl", true)}
                      />
                      <button
                        type="button"
                        className="-mt-2 mb-4 flex items-center gap-1 text-sm text-primary-5 underline underline-offset-2"
                        onClick={() => {
                          setFieldValue("locationUrl", "");
                          setFieldTouched("locationUrl", false);
                          setMapPickerToggle(true);
                        }}
                      >
                        <FaMapMarkerAlt className="h-3 w-3" aria-hidden="true" />
                        {t("COMMON.SELECT_FROM_MAPS")}
                      </button>
                    </>
                  )}

                  <div className="flex 2xl:gap-[143px] laptopitm:gap-[100px] lg:gap-[100px] miniscreen:gap-[85px] miniscreen7:gap-[95px] miniscreen6:gap-[120px] msscreen1:gap-[140px] justify-center mobilescreen:gap-1 mobilescreen:flex-col mb-4 mobilescreen:mb-4 checkbox-container">
                    <CheckBox
                      id="kuwaitis"
                      label={t("COMMON.KUWAITIS.ONLY")}
                      checked={selectedCheckBoxes.includes("kuwaitis")}
                      onChange={(checked) =>
                        handleCheckboxChange("kuwaitis", checked)
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
                    {/* <CheckBox
                      id="emergency"
                      label={t("COMMON.EMERGENCY_PRIORITY")}
                      checked={selectedCheckBoxes.includes("emergency")}
                      onChange={(checked) =>
                        handleCheckboxChange("emergency", checked)
                      }
                    /> */}
                  </div>

                  <div className="descritpionitm descritpionitm-ar">
                    {/*
                      * Labelled plainly, like the title: the "(Arabic)"
                      * qualifier only earns its place once a second language
                      * is on screen to distinguish it from.
                      */}
                    <Field
                      name="description_ar"
                      label={t("COMMON.DESCRIPTION")}
                      placeholder={t("COMMON.DESCRIPTION")}
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
