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
import DatePickerInput from "@/components/ui/DateField";
import TimepickerInput from "@/components/ui/TimePicker";
import AgeRange from "@/components/ui/AgeRange";
import RichTextEditor from "@/components/ui/RichTextEditor";
import UploadDocument from "@/components/ui/UploadDocument";
import DisabledButtonWithTooltip from "@/components/ui/DisabledButtonWithTooltip";
import { TagsCheckbox } from "@/components/ui/TagsCheckbox";
import { Modal } from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import Title from "@/components/shared/Title";
import { getDropdownChoicesRequest } from "@/features/auth/services/authApi";
import {
  createEvent,
  getEventById,
  republishEvent,
  updateEvent,
} from "@/features/events/services/eventsApi";
import { getAllOrganizations } from "@/features/shared/services/directory";
import { getApiErrorMessages } from "@/lib/api/errors";
import i18n from "@/lib/i18n/config";
import { fetchAddress, fetchCoordinates, formatDateToYYYYMMDD } from "@/lib/helpers";
import { NAV_STATE_KEYS, useConsumedNavState } from "@/lib/navigationState";
import { YupFlexibleUrl, YupOptionalUrl, YupRequiredString, YupStringMaxLength } from "@/features/shared/schemas";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import UpdateEventConfirmModal from "./UpdateEventConfirmModal";

/** Payload the event list / detail page stashes before pushing to /event-form. */
export interface EventFormNavState {
  id?: string;
  isRepublish?: boolean;
}

interface EventFormValues {
  title_ar: string;
  title_en: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  event_type: string;
  participation_type: string;
  participation_type_value_en: string;
  age: [number | null, number | null];
  gender: string;
  description_ar: string;
  description_en: string;
  location: string;
  location_url: string;
  registration_link: string;
  _interests: string[];
  event_images: File[];
  latitude: string;
  longitude: string;
  sponsors: { sponsorId: string; position: number }[];
}

interface EventFormProps {
  autoSetTimeOnClick?: boolean; // Auto-set time fields to 12:00 on first click
}

// Leaflet touches `window` at import time, so it can't be part of the SSR pass.
const LocationMapPicker = dynamic(
  () => import("@/components/ui/LocationMapPicker"),
  { ssr: false }
);

/**
 * Re-runs validation whenever a touched field gains a value, and keeps the
 * location field in sync with the loaded event.
 */
function EventFormEffects({
  values,
  touched,
  validateForm,
  setFieldValue,
  eventData,
  id,
  selectedLanguage,
  skipNextGeocodeRef,
}: {
  values: EventFormValues;
  touched: Record<string, unknown>;
  validateForm: () => Promise<unknown>;
  setFieldValue: (field: string, value: any) => void;
  eventData: any;
  id?: string;
  selectedLanguage: string;
  skipNextGeocodeRef: { current: boolean };
}) {
  useEffect(() => {
    const touchedFields = Object.keys(touched).filter(
      (fieldName) =>
        touched[fieldName] && !!values[fieldName as keyof EventFormValues]
    );
    if (touchedFields.length > 0) {
      validateForm();
    }
  }, [values, touched, validateForm]);

  // When editing with coordinates but no stored location text, reverse-geocode
  // them so the field isn't left empty.
  useEffect(() => {
    const getAddress = async () => {
      if (eventData?.latitude && eventData?.longitude && !eventData?.map_desc) {
        const result = await fetchAddress(
          eventData.latitude,
          eventData.longitude,
          selectedLanguage
        );
        skipNextGeocodeRef.current = true;
        setFieldValue("location", result); // Sync with Formik state
      }
    };
    getAddress();
  }, [
    eventData?.latitude,
    eventData?.longitude,
    eventData?.map_desc,
    selectedLanguage,
    setFieldValue,
  ]);

  // Sync location once eventData arrives (it loads after mount).
  // `map_desc` is a single language-agnostic field — no per-language lookup.
  useEffect(() => {
    if (!eventData || !id) return;
    if (eventData.map_desc) {
      skipNextGeocodeRef.current = true;
      setFieldValue("location", eventData.map_desc);
    }
    if (eventData.latitude) {
      setFieldValue("latitude", eventData.latitude.toString());
    }
    if (eventData.longitude) {
      setFieldValue("longitude", eventData.longitude.toString());
    }
  }, [eventData, setFieldValue, id, skipNextGeocodeRef]);

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

  return null;
}

export default function EventForm({
  autoSetTimeOnClick = true,
}: EventFormProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const authToken = useAuthStore((s) => s.user?.auth_token);
  // Set right before a map pick / a data sync fills `location` in
  // programmatically, so the forward-geocode effect skips that one change.
  const skipNextGeocodeRef = useRef(false);

  // Edit / repost target arrives via sessionStorage (React Router `location.state`).
  const navState = useConsumedNavState<EventFormNavState>(
    NAV_STATE_KEYS.eventForm
  );
  const id = navState?.id;
  const isRepublish = navState?.isRepublish;

  const [formKey, setFormKey] = useState(0);
  const [sponsorList, setSponsorList] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [preLoadedSponsors, setPreLoadedSponsors] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [sponsorIdsToFetch, setSponsorIdsToFetch] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [existingImageIds, setExistingImageIds] = useState<number[]>([]);
  const [modifiedEventImages, setModifiedEventImages] = useState<
    Array<{ id: number; image: string }>
  >([]);

  useEffect(() => {
    // Force Formik to remount when the language changes
    setFormKey((prevKey) => prevKey + 1);
  }, [selectedLanguage]);

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ["event-details", id],
    queryFn: () => getEventById({ id: id as string }),
    enabled: Boolean(id),
  });
  const eventData = apiResponse?.data;

  const createEventMutation = useMutation({ mutationFn: createEvent });
  const republishEventMutation = useMutation({ mutationFn: republishEvent });
  const updateEventMutation = useMutation({ mutationFn: updateEvent });

  // Extract sponsors from eventData for edit/repost mode
  useEffect(() => {
    if (!eventData?.event_sponsor_images?.length) return;

    const sponsorData = eventData.event_sponsor_images.map(
      (item: any) => item.organization
    );

    // The backend returns either nested organization objects or bare IDs
    const hasNestedObjects =
      sponsorData.length > 0 &&
      typeof sponsorData[0] === "object" &&
      sponsorData[0] !== null &&
      "full_name" in sponsorData[0];

    if (hasNestedObjects) {
      const sponsors = sponsorData.map((org: any) => ({
        id: String(org.id),
        full_name: org.full_name || org.company_name || "",
      }));
      setPreLoadedSponsors(sponsors);

      setSponsorList((prev) => {
        const newSponsors = sponsors.filter(
          (sponsor: { id: string }) =>
            !prev.some((existing) => existing.id === sponsor.id)
        );
        return [...newSponsors, ...prev];
      });
    } else {
      setSponsorIdsToFetch(
        sponsorData.filter((v: any) => v != null).map((v: any) => Number(v))
      );
    }
  }, [eventData]);

  useEffect(() => {
    if (!eventData) return;
    // Refresh the form with the loaded data
    setFormKey((prevKey) => prevKey + 1);
    const eventImages =
      eventData.event_images?.map((img: any) => ({
        id: img.id,
        image: img.image,
      })) || [];
    setModifiedEventImages(eventImages);
    setExistingImageIds(eventData.event_images?.map((img: any) => img.id) || []);
  }, [eventData]);

  const { data: eventTypeData, isLoading: eventTypeLoading } = useQuery({
    queryKey: ["event-type-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("event_type"),
    enabled: !!selectedLanguage,
  });
  const { data: participationTypeData, isLoading: participationTypeLoading } =
    useQuery({
      queryKey: ["event-participation-type-choices", selectedLanguage],
      queryFn: () => getDropdownChoicesRequest("event_participation_type"),
      enabled: !!selectedLanguage,
    });
  const { data: genderData, isLoading: genderLoading } = useQuery({
    queryKey: ["opportunity-gender-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("opportunity_gender"),
    enabled: !!selectedLanguage,
  });
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ["event-interest-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("event_interest"),
    enabled: !!selectedLanguage,
  });

  const tagOptions =
    tagsData?.data?.map((item: any) => ({
      id: String(item.id),
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
    })) || [];

  const genderOptions =
    genderData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
    })) || [];

  const {
    data: sponsorsData,
    isLoading: sponsorsLoading,
    isFetching: sponsorsFetching,
  } = useQuery({
    queryKey: ["all-organizations", currentPage],
    queryFn: () => getAllOrganizations({ page: currentPage, limit: 10 }),
    enabled: Boolean(authToken),
  });

  const handleMenuScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (
      target.scrollHeight - target.scrollTop === target.clientHeight &&
      !sponsorsLoading
    ) {
      setCurrentPage((prev) => prev + 1); // Fetch next page
    }
  };

  // Add paginated sponsors to the list
  useEffect(() => {
    if (!sponsorsData?.data) return;
    setSponsorList((prev) => {
      const newSponsors = sponsorsData.data
        .map((s: any) => ({
          id: String(s.id),
          full_name: s.full_name || s.company_name || "",
        }))
        .filter(
          (newSponsor: { id: string }) =>
            !prev.some((existing) => existing.id === newSponsor.id)
        );
      return [...prev, ...newSponsors];
    });
  }, [sponsorsData]);

  // Fetch sponsor details if we only have IDs
  const { data: sponsorsByIdsData } = useQuery({
    queryKey: ["organizations-by-ids", sponsorIdsToFetch],
    queryFn: () =>
      getAllOrganizations({ ids: sponsorIdsToFetch.join(","), limit: 100 }),
    enabled: sponsorIdsToFetch.length > 0 && Boolean(authToken),
  });

  useEffect(() => {
    if (!sponsorsByIdsData?.data) return;
    const sponsors = sponsorsByIdsData.data.map((s: any) => ({
      id: String(s.id),
      full_name: s.full_name || s.company_name || "",
    }));
    setPreLoadedSponsors(sponsors);

    setSponsorList((prev) => {
      const newSponsors = sponsors.filter(
        (sponsor: { id: string }) =>
          !prev.some((existing) => existing.id === sponsor.id)
      );
      return [...newSponsors, ...prev];
    });
  }, [sponsorsByIdsData]);

  const sponsorOptions = useMemo(() => {
    const sponsorMap = new Map<string, { label: string; value: string }>();

    // Pre-loaded sponsors (from the event being edited) win
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

  const eventTypeOptions = useMemo(() => {
    const data = eventTypeData?.data || [];
    const isHub = (item: any) => item.value_en === "Hub";
    // "Hub" is pinned to the top of the list
    const ordered = [...data.filter(isHub), ...data.filter((i: any) => !isHub(i))];
    return ordered.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
    }));
  }, [eventTypeData, selectedLanguage]);

  const participationTypeOrder = [
    "Free Event",
    "Free Event (Registration Required)",
    "Paid Event",
  ];

  const participationTypeOptions =
    participationTypeData?.data
      ?.map((item: any) => ({
        label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
        value: String(item.id),
        value_en: item.value_en,
      }))
      .sort(
        (a: any, b: any) =>
          participationTypeOrder.indexOf(a.value_en) -
          participationTypeOrder.indexOf(b.value_en)
      ) || [];

  const initialValues: EventFormValues = {
    title_ar: eventData?.title_ar || "",
    title_en: eventData?.title_en || "",
    description_ar: eventData?.description_ar || "",
    description_en: eventData?.description_en || "",
    age: [
      eventData?.from_age ? Number(eventData.from_age) : null,
      eventData?.to_age ? Number(eventData.to_age) : null,
    ],
    gender: eventData?.gender_display?.id
      ? String(eventData.gender_display.id)
      : "",
    startDate: eventData?.start_date || "",
    endDate: eventData?.end_date || "",
    startTime: eventData?.start_time?.split(":")?.slice(0, 2).join(":") || "",
    endTime: eventData?.end_time?.split(":")?.slice(0, 2).join(":") || "",
    event_type: eventData?.event_type_display?.id
      ? String(eventData.event_type_display.id)
      : "",
    participation_type: eventData?.participation_type_display?.id
      ? String(eventData.participation_type_display.id)
      : "",
    participation_type_value_en:
      eventData?.participation_type_display?.value_en || "",
    location: eventData?.map_desc || "",
    registration_link: eventData?.registration_link || "",
    _interests:
      eventData?.interest_display?.map((interest: { id: any }) =>
        String(interest.id)
      ) || [],
    event_images: [],
    location_url: eventData?.location_url || "",
    latitude: eventData?.latitude?.toString() || "",
    longitude: eventData?.longitude?.toString() || "",
    sponsors: eventData?.event_sponsor_images?.length
      ? eventData.event_sponsor_images.map((sponsor: any, index: number) => ({
          sponsorId:
            typeof sponsor.organization === "object"
              ? String(sponsor.organization?.id || "")
              : String(sponsor.organization || ""),
          position: index + 1,
        }))
      : [{ sponsorId: "", position: 1 }],
  };

  const notInPast = (value?: string) => {
    // Editing an already-scheduled event in place may legitimately keep its
    // original date even if that date has since passed — only a brand-new
    // event or a republish (a fresh copy, scheduled anew) must be future-dated.
    if (id && !isRepublish) return true;
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
    title_ar: YupStringMaxLength(100).concat(YupRequiredString),
    title_en: YupStringMaxLength(100).concat(YupRequiredString),
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
    event_type: Yup.string().concat(YupRequiredString),
    participation_type: Yup.string().concat(YupRequiredString),
    registration_link: Yup.string().when("participation_type_value_en", {
      is: "Free Event",
      then: (schema) => schema.nullable(),
      otherwise: () => YupFlexibleUrl,
    }),
    location_url: YupOptionalUrl,
    location: YupRequiredString.test(
      "has-coordinates",
      t("COMMON.INVALID_ADDRESS"),
      function (value) {
        const { latitude, longitude } = this.parent;
        return (!!value && latitude !== undefined) || longitude !== undefined;
      }
    ),
    description_ar: descriptionSchema,
    description_en: descriptionSchema,
    _interests: Yup.array()
      .of(Yup.string())
      .min(1, i18n.t("COMMON.REQUIRED.FIELD")),
    event_images: Yup.mixed().test(
      "has-files",
      i18n.t("COMMON.REQUIRED.FIELD"),
      function (value) {
        return (
          (Array.isArray(value) && value.length > 0) ||
          modifiedEventImages.length > 0
        );
      }
    ),
  });

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
      event_images: ".uploaddocfiles",
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

  const handleSubmit = async (
    values: EventFormValues,
    { resetForm }: FormikHelpers<EventFormValues>
  ) => {
    try {
      const formData = new FormData();

      formData.append("title_ar", values.title_ar);
      formData.append("title_en", values.title_en);
      formData.append("description_ar", values.description_ar);
      formData.append("description_en", values.description_en);
      formData.append("start_date", formatDateToYYYYMMDD(values.startDate));
      formData.append("end_date", formatDateToYYYYMMDD(values.endDate));
      formData.append("start_time", values.startTime);
      formData.append("end_time", values.endTime);
      formData.append("latitude", values.latitude);
      formData.append("longitude", values.longitude);
      formData.append("primary_language", selectedLanguage);
      // The form keeps concise UI field names, but the API accepts relation
      // ids under their explicit `*_id` contract.
      formData.append("event_type_id", values.event_type);
      formData.append("participation_type_id", values.participation_type);

      // Only append registration_link if it's not "Free Event"
      if (
        values.registration_link &&
        values.participation_type_value_en !== "Free Event"
      ) {
        formData.append("registration_link", values.registration_link);
      }

      formData.append(
        "from_age",
        values.age[0] !== null ? values.age[0].toString() : ""
      );
      formData.append(
        "to_age",
        values.age[1] !== null ? values.age[1].toString() : ""
      );
      formData.append("map_desc", values.location);
      formData.append("location_url", values.location_url);
      if (values.gender) formData.append("gender_id", values.gender);
      values._interests.forEach((interest) => {
        formData.append("interest_ids[]", interest);
      });
      // On update, tell the backend which existing images to keep. Sending no
      // existing_image_ids at all means "drop them".
      if (id && eventData?.event_images?.length > 0) {
        existingImageIds.forEach((imageId) => {
          formData.append("existing_image_ids", imageId.toString());
        });
      }

      values.event_images.forEach((file) => {
        if (file instanceof File) {
          formData.append("images[]", file);
        }
      });

      // Handle sponsors (organizations and positions only)
      values.sponsors.forEach((sponsor, index) => {
        const idKey = index + 1;
        if (sponsor.sponsorId) {
          formData.append(
            `event_sponsor_images_organization_${idKey}`,
            sponsor.sponsorId
          );
        }
        formData.append(
          `event_sponsor_images_position_${idKey}`,
          String(sponsor.position)
        );
      });

      if (id && !isRepublish) {
        // Update existing event — ask for confirmation first
        setPendingFormData(formData);
        setShowUpdateConfirmModal(true);
      } else if (id && isRepublish) {
        await republishEventMutation.mutateAsync({ id, formData });
        toast.success(t("COMMON.TOAST.CREATE_EVENT_SUCCESS"));
        router.push("/event-post-thankyou");
      } else {
        // Create a brand-new event
        await createEventMutation.mutateAsync(formData);
        toast.success(t("COMMON.TOAST.CREATE_EVENT_SUCCESS"));
        router.push("/event-post-thankyou");
      }
      resetForm();
    } catch (err) {
      const messages = getApiErrorMessages(err, selectedLanguage);
      const fallback =
        id && !isRepublish
          ? t("COMMON.TOAST.EVENT_FAILED")
          : t("COMMON.TOAST.CREATE_EVENT_FAILED");
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(fallback);
      }
    }
  };

  const handleUpdateConfirm = async () => {
    if (!pendingFormData || !id) return;
    try {
      await updateEventMutation.mutateAsync({ id, formData: pendingFormData });
      toast.success(t("COMMON.TOAST.UPDATE_EVENT_SUCCESS"));
      router.push(`/event-details/${id}`);
      setPendingFormData(null);
    } catch (err) {
      const messages = getApiErrorMessages(err, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.UPDATE_EVENT_FAILED"));
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
    if (fieldName !== "event_images") return;

    if (isExistingFile) {
      const removedImageId = modifiedEventImages[index]?.id;
      setModifiedEventImages((prev) => prev.filter((_, i) => i !== index));
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
    } else {
      const currentFiles = Array.isArray(values[fieldName])
        ? [...values[fieldName]]
        : [];
      currentFiles.splice(index, 1);
      setFieldValue(fieldName, currentFiles);
    }
  };

  // `navState === null` means the stashed payload has not been read yet.
  if (navState === null || isLoading) {
    return <Loader />;
  }

  return (
    <>
      <Modal
        open={showUpdateConfirmModal}
        onClose={() => setShowUpdateConfirmModal(false)}
        title={t("COMMON.UPDATE_EVENT")}
        size="sm"
      >
        <UpdateEventConfirmModal
          setOpenModal={() => setShowUpdateConfirmModal(false)}
          onConfirm={handleUpdateConfirm}
          eventTitle={
            eventData && {
              title_en: eventData?.title_en,
              title_ar: eventData?.title_ar,
            }
          }
        />
      </Modal>

      <div className="border-t border-[#000]">
        <div className="2xl:w-[1225px] lg:w-[1050px] md:w-[96%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] mx-auto">
          <h2>
            <Title text={t("COMMON.EVENT.FORM")} variant="default" />
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
                  <EventFormEffects
                    values={values}
                    touched={touched as Record<string, unknown>}
                    validateForm={validateForm}
                    setFieldValue={setFieldValue}
                    eventData={eventData}
                    id={id}
                    selectedLanguage={selectedLanguage}
                    skipNextGeocodeRef={skipNextGeocodeRef}
                  />

                  <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col miniscreen:flex-col miniscreen:gap-0">
                    <Input
                      name="title_ar"
                      label={t("COMMON.ENTER_TITLE_AR")}
                      type="text"
                      dir="rtl"
                    />
                    <Input
                      name="title_en"
                      label={t("COMMON.ENTER_TITLE_EN")}
                      type="text"
                      dir="ltr"
                    />
                    <div className="flex w-full xss:flex-col gap-6 xss:gap-0">
                      <SelectInput
                        name="event_type"
                        label={t("COMMON.EVENT.TYPE")}
                        options={eventTypeOptions}
                        onChange={(selectedOption) =>
                          setFieldValue(
                            "event_type",
                            selectedOption?.value || ""
                          )
                        }
                        disabled={eventTypeLoading}
                      />
                      <SelectInput
                        name="participation_type"
                        label={t("COMMON.PARTICIPATION_TYPE")}
                        options={participationTypeOptions}
                        onChange={(selectedOption) => {
                          setFieldValue(
                            "participation_type",
                            selectedOption?.value || ""
                          );
                          setFieldValue(
                            "participation_type_value_en",
                            selectedOption?.value_en || ""
                          );
                        }}
                        disabled={participationTypeLoading}
                      />
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="lg:block md:hidden mobilescreen:hidden mediumscreen1:block">
                    <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col miniscreen:flex-col miniscreen:gap-0 xss:pt-0">
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
                        {({ field }: FieldProps<string, EventFormValues>) => (
                          <TimepickerInput
                            label={t("COMMON.START_TIME")}
                            className="w-full"
                            autoSetTime={autoSetTimeOnClick}
                            {...field}
                          />
                        )}
                      </Field>
                      <Field name="endTime">
                        {({ field }: FieldProps<string, EventFormValues>) => (
                          <TimepickerInput
                            label={t("COMMON.END_TIME")}
                            className="w-full"
                            autoSetTime={autoSetTimeOnClick}
                            {...field}
                          />
                        )}
                      </Field>
                    </div>
                    <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col miniscreen:flex-col miniscreen:gap-0">
                      <AgeRange name="age" label={t("COMMON.AGE")} />
                      <SelectInput
                        name="gender"
                        label={t("COMMON.GENDERPLACEHOLDER")}
                        options={genderOptions}
                        onChange={(selectedOption) =>
                          setFieldValue("gender", selectedOption?.value || "")
                        }
                        disabled={genderLoading}
                      />
                    </div>
                    <div className="flex gap-6 mobilescreen:gap-0 mobilescreen:flex-col miniscreen:flex-col miniscreen:gap-0">
                      <div className="flex-1">
                        <Input
                          name="location"
                          label={t("COMMON.LOCATION")}
                          type="text"
                          className="w-full"
                        />
                        <Input
                          name="location_url"
                          label={t("COMMON.LOCATION_URL")}
                          placeholder={t("COMMON.LOCATION_URL_PLACEHOLDER")}
                          type="text"
                          className="w-full text-left"
                          dir="ltr"
                        />
                        <LocationMapPicker
                          latitude={values.latitude}
                          longitude={values.longitude}
                          onPick={async (lat, lng) => {
                            setFieldValue("latitude", lat);
                            setFieldValue("longitude", lng);
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
                      </div>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="lg:hidden md:block mobilescreen:block mediumscreen1:hidden">
                    <div className="flex gap-6 extrasmall:flex-col extrasmall:gap-0">
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
                    </div>
                    <div className="flex gap-6 extrasmall:flex-col extrasmall:gap-0">
                      <Field name="startTime">
                        {({ field }: FieldProps<string, EventFormValues>) => (
                          <TimepickerInput
                            label={t("COMMON.START_TIME")}
                            className="w-full"
                            autoSetTime={autoSetTimeOnClick}
                            {...field}
                          />
                        )}
                      </Field>
                      <Field name="endTime">
                        {({ field }: FieldProps<string, EventFormValues>) => (
                          <TimepickerInput
                            label={t("COMMON.END_TIME")}
                            className="w-full"
                            autoSetTime={autoSetTimeOnClick}
                            {...field}
                          />
                        )}
                      </Field>
                    </div>
                    <div className="flex gap-6 extrasmall:flex-col extrasmall:gap-0">
                      <AgeRange name="age" label={t("COMMON.AGE")} />
                      <SelectInput
                        name="gender"
                        label={t("COMMON.GENDERPLACEHOLDER")}
                        options={genderOptions}
                        onChange={(selectedOption) =>
                          setFieldValue("gender", selectedOption?.value || "")
                        }
                        disabled={genderLoading}
                      />
                    </div>
                    <div className="flex gap-6 extrasmall:flex-col extrasmall:gap-0">
                      <div className="flex-1">
                        <Input
                          name="location"
                          label={t("COMMON.LOCATION")}
                          type="text"
                          className="w-full"
                        />
                        <Input
                          name="location_url"
                          label={t("COMMON.LOCATION_URL")}
                          placeholder={t("COMMON.LOCATION_URL_PLACEHOLDER")}
                          type="text"
                          className="w-full text-left"
                          dir="ltr"
                        />
                        <LocationMapPicker
                          latitude={values.latitude}
                          longitude={values.longitude}
                          onPick={async (lat, lng) => {
                            setFieldValue("latitude", lat);
                            setFieldValue("longitude", lng);
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
                      </div>
                    </div>
                  </div>

                  {values.participation_type &&
                    values.participation_type_value_en !== "Free Event" && (
                      <div className="w-full">
                        <Input
                          name="registration_link"
                          label={t("COMMON.REGISTRATION_LINK")}
                          type="text"
                        />
                      </div>
                    )}

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
                      <div>
                        {values.sponsors.map((sponsor, index) => (
                          <div
                            key={index}
                            className="flex mobilescreen:flex-col mobilescreen:gap-4 gap-6 mb-4 mobilescreen:mb-0 items-center"
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
                              isLoading={sponsorsLoading || sponsorsFetching}
                              isSearchable={false}
                              onChange={(selectedOption) =>
                                setFieldValue(
                                  `sponsors[${index}].sponsorId`,
                                  selectedOption?.value || ""
                                )
                              }
                            />
                            <div className="flex items-center gap-2 mobilescreen:mb-4">
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
                      name="event_images"
                      label={t("COMMON.UPLOAD_IMAGE")}
                      accept="image/jpeg, image/png"
                      multiple
                      setFieldValue={setFieldValue}
                      existingFiles={modifiedEventImages.map((file) => ({
                        id: file.id,
                        image: file.image,
                      }))}
                      onRemove={(index, isExisting) =>
                        handleRemoveExistingFile(
                          index,
                          isExisting,
                          "event_images",
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

                  <div className="flex justify-center 2xl:pt-[70px] laptopmain:2xl:pt-[40px] laptop:pt-[40px] pt-[40px]">
                    <div className="flex gap-6 extrasmall:flex-col">
                      <DisabledButtonWithTooltip
                        type="button"
                        variant="primary"
                        size="medium"
                        onClick={handleFormSubmit}
                        className="disabled:cursor-not-allowed disabled:opacity-50"
                        tooltipText=""
                      >
                        {id && !isRepublish
                          ? t("COMMON.SAVE")
                          : isRepublish
                            ? t("COMMON.REPOST")
                            : t("COMMON.PUBLISH")}
                      </DisabledButtonWithTooltip>
                    </div>
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
