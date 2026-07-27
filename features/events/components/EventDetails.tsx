"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import Title from "@/components/shared/Title";
import SponsorsClient from "@/features/home/components/SponsorsClient";
import {
  getEventById,
  getEventTimeSlots,
  registerForEvent,
  unregisterFromEvent,
} from "@/features/services/api";
import { formatSingleDate } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import EventFeedback from "./EventFeedback";

interface ChoiceDisplay {
  id?: string;
  value_en?: string;
  value_ar?: string;
}

interface EventDetailsData {
  id: string;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  latitude: number | string;
  longitude: number | string;
  location_en: string;
  location_ar: string;
  from_age?: number;
  to_age?: number;
  registration_required?: boolean;
  paid_registration?: boolean;
  registration_fee?: string;
  registration_link?: string;
  is_creator?: boolean;
  is_registered?: boolean;
  event_status?: string;
  primary_language?: string;
  has_scan_permission?: boolean;
  event_images?: Array<{ id: number; image: string }>;
  event_sponsor_images?: Array<{
    id: number;
    image: string;
    position: number;
  }>;
  event_type_display?: ChoiceDisplay;
  participation_type_display?: ChoiceDisplay;
  attendance_type_display?: ChoiceDisplay;
  gender_display?: ChoiceDisplay;
  interest_display?: Array<ChoiceDisplay & { id: string }>;
  created_by?: {
    id: string;
    full_name?: string;
    profile_pic?: string | null;
    is_public?: boolean;
    facebook_link?: string | null;
    twitter_link?: string | null;
    whatsapp_link?: string | null;
    instagram_link?: string | null;
    linkedin_link?: string | null;
  };
}

interface EventTimeSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
}

type RegistrationMode = "register" | "unregister" | "fee" | "timeslot" | null;

const asset = (path: string) => `/assets/${path}`;

function localizedError(error: unknown, language: string, fallback: string) {
  const response = (
    error as {
      response?: {
        data?: {
          msg?: string;
          message_en?: string;
          message_ar?: string;
          errors?: Record<string, string | Record<string, string> | string[]>;
        };
      };
    }
  )?.response?.data;

  const localizedMessage =
    response?.msg || (language === "ar" ? response?.message_ar : response?.message_en);
  if (localizedMessage) return localizedMessage;

  const firstError = response?.errors && Object.values(response.errors)[0];
  if (typeof firstError === "string") return firstError;
  if (Array.isArray(firstError)) return firstError[0] || fallback;
  if (firstError && typeof firstError === "object") {
    return firstError[language] || fallback;
  }
  return fallback;
}

function AddToCalendar({ event }: { event: EventDetailsData }) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);

  const downloadCalendarFile = () => {
    const title = language === "ar" ? event.title_ar : event.title_en;
    const location = language === "ar" ? event.location_ar : event.location_en;
    const start = new Date(`${event.start_date}T${event.start_time}`);
    const end = new Date(`${event.end_date}T${event.end_time}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error(t("COMMON.CALENDAR_ERROR_MESSAGE"));
      return;
    }

    const toIcsDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const escapeValue = (value: string) =>
      value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Fursa//Events//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:fursa-event-${event.id}@fursa`,
      `SUMMARY:${escapeValue(title || "Fursa event")}`,
      `LOCATION:${escapeValue(location || "")}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || "event").replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(t("COMMON.CALENDAR_TOAST_MESSAGE"));
  };

  return (
    <button
      type="button"
      onClick={downloadCalendarFile}
      className="border-b border-primary-5 font-bold text-primary-5 2xl:text-xl"
    >
      {t("COMMON.ADD_TO_CALENDAR")}
    </button>
  );
}

function EventSponsors({
  sponsors,
}: {
  sponsors: NonNullable<EventDetailsData["event_sponsor_images"]>;
}) {
  const { t } = useTranslation();
  if (!sponsors.length) return null;

  return (
    <section className="relative bg-[#DBDBDB] p-8 lg:bottom-[100px]">
      <h2 className="mb-8 text-center text-[28px] font-bold text-primary-5">
        {t("COMMON.EVENT_SPONSOR")}
      </h2>
      <div className="grid grid-cols-2 items-center gap-6">
        {[...sponsors]
          .sort((a, b) => a.position - b.position)
          .map((sponsor) => (
            <img
              key={sponsor.id}
              src={sponsor.image || asset("profile/org_profile.svg")}
              alt={t("COMMON.EVENT_SPONSOR")}
              className="mx-auto max-h-20 max-w-full rounded-full object-contain"
            />
          ))}
      </div>
    </section>
  );
}

function TimeSlotPicker({
  eventId,
  selectedSlotId,
  onSelect,
}: {
  eventId: string;
  selectedSlotId?: number;
  onSelect: (slotId: number) => void;
}) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState("");
  const timeSlotQuery = useQuery({
    queryKey: ["event-time-slots", eventId],
    queryFn: () => getEventTimeSlots(eventId),
  });

  const slots: EventTimeSlot[] = useMemo(
    () =>
      Array.isArray(timeSlotQuery.data?.data) ? timeSlotQuery.data.data : [],
    [timeSlotQuery.data]
  );
  const slotsByDate = useMemo(
    () =>
      slots.reduce<Record<string, EventTimeSlot[]>>((result, slot) => {
        (result[slot.date] ||= []).push(slot);
        return result;
      }, {}),
    [slots]
  );
  const dates = useMemo(
    () => Object.keys(slotsByDate).sort((a, b) => a.localeCompare(b)),
    [slotsByDate]
  );
  const activeDate = selectedDate || dates[0] || "";

  if (timeSlotQuery.isLoading) return <Loader inline />;
  if (timeSlotQuery.isError) {
    return <p className="py-8 text-center text-red-500">{t("COMMON.TOAST.REGISTRATION_FAILED")}</p>;
  }
  if (!slots.length) {
    return <p className="py-8 text-center text-gray-500">{t("COMMON.NO_TIME_SLOTS_AVAILABLE")}</p>;
  }

  return (
    <div>
      <div className="mb-5 flex justify-center">
        <select
          value={activeDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="rounded-xl border px-4 py-3 text-primary-5 outline-none focus:border-primary-5"
        >
          {dates.map((date) => (
            <option key={date} value={date}>
              {moment(date).format("ddd, MMMM D, YYYY")}
            </option>
          ))}
        </select>
      </div>
      <h3 className="mb-6 text-center text-4xl font-bold text-primary-5">
        {t("COMMON.SELECT_TIME")}
      </h3>
      <div className="grid grid-cols-1 justify-items-center gap-4 md:grid-cols-2">
        {(slotsByDate[activeDate] || []).map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelect(slot.id)}
            className={`h-[84px] w-[252px] rounded-[15px] px-8 py-4 ${
              selectedSlotId === slot.id
                ? "bg-primary-5 text-white"
                : "bg-[#EFF0F6] text-[#181822CC]"
            }`}
          >
            {moment(slot.start_time, "HH:mm:ss").format("h:mm a")} -{" "}
            {moment(slot.end_time, "HH:mm:ss").format("h:mm a")}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 pb-5 font-bold 2xl:text-xl">
      <img src={icon} alt="" className="h-5 w-5 object-contain" />
      {label && <span className="text-primary-5">{label} :</span>}
      <span className="text-secondary-102">{children}</span>
    </div>
  );
}

export default function EventDetails({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showMoreDescription, setShowMoreDescription] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number>();

  const eventQuery = useQuery({
    queryKey: ["event-details", eventId, Boolean(user?.auth_token)],
    queryFn: () => getEventById({ id: eventId, passToken: Boolean(user?.auth_token) }),
    enabled: Boolean(eventId),
  });
  const event = eventQuery.data?.data as EventDetailsData | undefined;

  useEffect(() => {
    const responseStatus = (
      eventQuery.error as { response?: { status?: number; data?: unknown } }
    )?.response?.status;
    if (responseStatus !== 404) return;

    toast.error(
      localizedError(eventQuery.error, language, t("COMMON.EVENT_NOT_FOUND"))
    );
    router.replace("/404");
  }, [eventQuery.error, language, router, t]);

  const closeRegistration = () => {
    setRegistrationMode(null);
    setSelectedSlotId(undefined);
  };

  const registrationMutation = useMutation({
    mutationFn: () =>
      registerForEvent({
        event: eventId,
        ...(selectedSlotId ? { time_slot_id: selectedSlotId } : {}),
      }),
    onSuccess: () => {
      toast.success(
        t(
          selectedSlotId
            ? "COMMON.TOAST.TIME_SLOT_REGISTRATION_SUCCESSFUL"
            : "COMMON.TOAST.REGISTRATION_SUCCESSFUL"
        )
      );
      if (event) {
        sessionStorage.setItem(
          "event_thankyou_details",
          JSON.stringify({
            title_ar: event.title_ar,
            title_en: event.title_en,
            start_date: event.start_date,
            isInPerson: true,
          })
        );
      }
      closeRegistration();
      queryClient.invalidateQueries({ queryKey: ["event-details", eventId] });
      router.push("/event-thankyou");
    },
    onError: (error) =>
      toast.error(
        localizedError(error, language, t("COMMON.TOAST.REGISTRATION_FAILED"))
      ),
  });

  const unregisterMutation = useMutation({
    mutationFn: () => unregisterFromEvent(eventId),
    onSuccess: () => {
      toast.success(t("COMMON.TOAST.UNREGISTRATION_SUCCESSFUL"));
      closeRegistration();
      queryClient.invalidateQueries({ queryKey: ["event-details", eventId] });
    },
    onError: (error) =>
      toast.error(
        localizedError(error, language, t("COMMON.TOAST.UNREGISTRATION_FAILED"))
      ),
  });

  if (eventQuery.isLoading) return <Loader />;
  if (eventQuery.isError || !event) {
    return (
      <div className="mx-auto max-w-3xl py-24 text-center">
        <p className="mb-6 text-lg text-red-600">
          {localizedError(eventQuery.error, language, t("COMMON.EVENT_NOT_FOUND"))}
        </p>
        <Button size="medium" onClick={() => eventQuery.refetch()}>
          {language === "ar" ? "إعادة المحاولة" : "Retry"}
        </Button>
      </div>
    );
  }

  const organizerPath = event.created_by?.is_public
    ? `/public-profile/${event.created_by.id}`
    : `/volunteer-private-profile/${event.created_by?.id}`;
  const description =
    (event.primary_language === "ar" ? event.description_ar : event.description_en) || "";
  const visibleDescription =
    description.length > 300 && !showMoreDescription
      ? `${description.substring(0, 300)}...`
      : description;
  const displayValue = (value?: ChoiceDisplay) =>
    value?.[language === "ar" ? "value_ar" : "value_en"] || "";
  const isActive = event.event_status === "upcoming" || event.event_status === "inprogress";

  const openRegistration = () => {
    if (event.is_creator) {
      const republish = event.event_status === "completed" || event.event_status === "inprogress";
      router.push(`/event-form?id=${event.id}${republish ? "&republish=true" : ""}`);
      return;
    }
    if (!user?.auth_token) {
      router.push(`/login?returnTo=${encodeURIComponent(`/event-details/${event.id}`)}`);
      return;
    }
    if (event.paid_registration) {
      setRegistrationMode(
        event.attendance_type_display?.value_en === "Fixed Date Entry"
          ? "timeslot"
          : "fee"
      );
    } else {
      setRegistrationMode(event.is_registered ? "unregister" : "register");
    }
  };

  const actionButton = (mobile = false) => {
    if (event.is_creator) {
      if (!user?.is_verified || user.is_banned) return null;
      const republish = event.event_status === "completed" || event.event_status === "inprogress";
      return (
        <Button
          size="medium"
          className={mobile ? "my-6 !h-14 !w-full" : "whitespace-nowrap"}
          onClick={openRegistration}
        >
          {t(republish ? "COMMON.REPOST" : "COMMON.EDIT_TEXT")}
        </Button>
      );
    }

    const isExternalPaidEvent =
      event.registration_link &&
      event.participation_type_display?.value_en !== "Free Event" &&
      isActive;
    if (isExternalPaidEvent) {
      return (
        <Button
          size="medium"
          className={mobile ? "my-6 !h-14 !w-full" : "whitespace-nowrap"}
          onClick={() => window.open(event.registration_link, "_blank", "noopener,noreferrer")}
        >
          {t("COMMON.REGISTRATION_LINK")}
        </Button>
      );
    }

    if (event.registration_required && isActive) {
      return (
        <Button
          size="medium"
          className={mobile ? "my-6 !h-14 !w-full" : "whitespace-nowrap"}
          onClick={openRegistration}
        >
          {t(event.is_registered ? "COMMON.UNREGISTER" : "COMMON.REGISTER")}
        </Button>
      );
    }
    return null;
  };

  const socialLinks = [
    ["facebook_link", "profile/facebook.svg", "Facebook"],
    ["twitter_link", "profile/twitter.svg", "Twitter"],
    ["whatsapp_link", "profile/whatsapp.svg", "WhatsApp"],
    ["instagram_link", "profile/instagram.svg", "Instagram"],
    ["linkedin_link", "profile/linkdin.svg", "LinkedIn"],
  ] as const;

  const modalTitle =
    registrationMode === "fee"
      ? t("COMMON.REGISTARTION.FEE")
      : registrationMode === "timeslot"
        ? t("COMMON.TIME")
        : registrationMode === "unregister"
          ? t("COMMON.CONFIRM_UNREGISTRATION")
          : t("COMMON.CONFIRM_REGISTRATION");

  return (
    <div className="w-full">
      <Modal
        open={registrationMode !== null}
        onClose={closeRegistration}
        title={modalTitle}
        size={registrationMode === "timeslot" ? "md" : "sm"}
      >
        {registrationMode === "timeslot" ? (
          <>
            <TimeSlotPicker
              eventId={event.id}
              selectedSlotId={selectedSlotId}
              onSelect={setSelectedSlotId}
            />
            <div className="mt-8 flex justify-center">
              <Button
                size="medium"
                disabled={!selectedSlotId || registrationMutation.isPending}
                onClick={() => registrationMutation.mutate()}
              >
                {t("COMMON.CONFIRM")}
              </Button>
            </div>
          </>
        ) : registrationMode === "fee" ? (
          <>
            <p className="pb-10 text-center text-[70px] font-bold text-primary-5">
              {event.registration_fee || "—"}
            </p>
            <div className="flex justify-center">
              <Button
                size="medium"
                disabled={registrationMutation.isPending}
                onClick={() => registrationMutation.mutate()}
              >
                {t("COMMON.PAY_NOW")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="pb-10 text-center text-lg">
              {t(
                registrationMode === "unregister"
                  ? "COMMON.EVENT.UNREGISTER_CONFIRMATION_MESSAGE"
                  : "COMMON.ARE_YOU_SURE_REGISTER_FOR_EVENT"
              )}
            </p>
            <div className="flex justify-center gap-5 xss:flex-col">
              <Button
                size="medium"
                className="xss:!w-full"
                disabled={registrationMutation.isPending || unregisterMutation.isPending}
                onClick={() =>
                  registrationMode === "unregister"
                    ? unregisterMutation.mutate()
                    : registrationMutation.mutate()
                }
              >
                {t("COMMON.CONFIRM")}
              </Button>
              <Button
                variant="secondary"
                size="medium"
                className="xss:!w-full"
                onClick={closeRegistration}
              >
                {t("COMMON.CANCEL")}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <div className="relative h-[320px] w-full md:h-[460px]">
        <img
          src={event.event_images?.[0]?.image || asset("voluneteerevent/eventbaner.svg")}
          alt={language === "ar" ? event.title_ar : event.title_en}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mx-auto w-[90%] py-10 2xl:py-[70px] mobilescreen:w-full">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[380px_auto] lg:gap-[30px] 2xl:grid-cols-[470px_auto] 2xl:gap-[69px]">
          <aside>
            <div className="flex flex-col items-center">
              <Link href={organizerPath}>
                <img
                  src={event.created_by?.profile_pic || asset("profile/org_profile.svg")}
                  alt={event.created_by?.full_name || ""}
                  className="relative z-10 h-[200px] w-[200px] rounded-full border-2 border-primary-5 bg-white object-cover 2xl:h-[300px] 2xl:w-[300px] xss:h-[130px] xss:w-[130px]"
                />
              </Link>
              <div className="relative bottom-[50px] flex w-full flex-col items-center bg-[#E5E5E5] px-5 pb-10 pt-20 lg:bottom-[100px] lg:pt-[137px]">
                <Link href={organizerPath}>
                  <div className="w-[252px] rounded-[20px] bg-primary-5 p-6 text-center text-white shadow-[0px_4px_4px_0px_#00000040]">
                    <h3 className="font-bold 2xl:text-xl">
                      {event.created_by?.full_name}
                    </h3>
                  </div>
                </Link>
                <div className="mt-8 flex justify-center gap-3">
                  {socialLinks.map(([field, icon, label]) => {
                    const href = event.created_by?.[field];
                    return href ? (
                      <a
                        key={field}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                      >
                        <img src={asset(icon)} alt="" className="h-[31px] w-[31px]" />
                      </a>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
            <EventSponsors sponsors={event.event_sponsor_images || []} />
          </aside>

          <main className="lg:pt-[70px] mobilescreen:mx-auto mobilescreen:w-[90%] mobilescreen:pt-0">
            <div className="flex items-start justify-between gap-5">
              <div className="pb-5 lg:w-[75%] xss:w-full">
                <Title
                  text={
                    event.primary_language === "ar" ? event.title_ar : event.title_en
                  }
                  hasMargin={false}
                  className="text-start 2xl:leading-[50px] lg:leading-[40px]"
                />
              </div>
              <div className="block xss:hidden">{actionButton()}</div>
            </div>

            <DetailRow icon={asset("homepage/learn_type.svg")} label={t("COMMON.TYPE")}>
              {displayValue(event.event_type_display)}
            </DetailRow>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <DetailRow icon={asset("homepage/dateicn.svg")} label={t("COMMON.START.DATE")}>
                {formatSingleDate(event.start_date, language, t)}
              </DetailRow>
              <DetailRow icon={asset("homepage/dateicn.svg")} label={t("COMMON.END.DATE")}>
                {formatSingleDate(event.end_date, language, t)}
              </DetailRow>
              <DetailRow icon={asset("homepage/timeicn.svg")}>
                {moment(event.start_time, "HH:mm:ss").format("hh:mm")} {t(
                  moment(event.start_time, "HH:mm:ss").format("a") === "am"
                    ? "COMMON.AM"
                    : "COMMON.PM"
                )}{" "}
                - {moment(event.end_time, "HH:mm:ss").format("hh:mm")} {t(
                  moment(event.end_time, "HH:mm:ss").format("a") === "am"
                    ? "COMMON.AM"
                    : "COMMON.PM"
                )}
              </DetailRow>
            </div>

            {user?.auth_token && (
              <div className="pb-5">
                <AddToCalendar event={event} />
              </div>
            )}

            <div className="mb-6 border-b">
              <div className="flex xss:flex-col">
                <div className="w-1/2 pt-5 xss:w-full">
                  <DetailRow icon={asset("homepage/locations.svg")}>
                    <button
                      type="button"
                      className="line-clamp-1 hover:underline"
                      title={language === "ar" ? event.location_ar : event.location_en}
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      {language === "ar" ? event.location_ar : event.location_en}
                    </button>
                  </DetailRow>
                  {event.from_age ? (
                    <DetailRow icon={asset("voluneteerevent/age.svg")} label={t("COMMON.AGE")}>
                      {event.from_age}
                      {event.to_age ? ` - ${event.to_age}` : " +"}
                    </DetailRow>
                  ) : null}
                  {event.gender_display?.value_en ? (
                    <DetailRow icon={asset("voluneteerevent/gender.svg")} label={t("COMMON.GENDER")}>
                      {displayValue(event.gender_display)}
                    </DetailRow>
                  ) : null}
                </div>
                <div className="hidden xss:block">{actionButton(true)}</div>
              </div>
            </div>

            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-primary-5 2xl:text-xl">
                  <img
                    src={asset("voluneteerevent/rightarrows.svg")}
                    alt=""
                    className={language === "ar" ? "rotate-180" : ""}
                  />
                  {t("COMMON.DESCRIPTION")}
                </h2>
                {description.length > 300 && (
                  <button
                    type="button"
                    onClick={() => setShowMoreDescription((current) => !current)}
                    className="flex items-center gap-1 font-bold text-secondary-102"
                  >
                    {t("COMMON.VIEW")} {t(showMoreDescription ? "COMMON.LESS" : "COMMON.MORE")}
                    {showMoreDescription ? <ChevronUp /> : <ChevronDown />}
                  </button>
                )}
              </div>
              <div
                className="text-sm font-semibold text-secondary-102 2xl:text-lg"
                dangerouslySetInnerHTML={{ __html: visibleDescription }}
              />
            </section>

            {event.interest_display?.length ? (
              <div className="mb-6 mt-6 flex flex-wrap items-center gap-6 xss:gap-2">
                <img src={asset("voluneteerevent/label.svg")} alt="" />
                {event.interest_display.map((interest, index) => {
                  const value = displayValue(interest);
                  const colors = ["#70B4C2", "#FC9555", "#D9EF61", "#5271FF"];
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      style={{ backgroundColor: colors[index % colors.length] }}
                      className={`rounded-[20px] px-8 py-[13px] text-sm ${
                        index % colors.length === 3 ? "text-white" : "text-primary-5"
                      }`}
                      onClick={() =>
                        router.push(`/events-and-activities?tags=${encodeURIComponent(value)}`)
                      }
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {event.event_status === "completed" && (
              <EventFeedback eventId={event.id} />
            )}
          </main>
        </div>
      </div>

      <div className="border-t pt-10 2xl:pt-[70px]">
        <SponsorsClient />
      </div>
    </div>
  );
}
