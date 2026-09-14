"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import AddToCalendar from "@/components/shared/AddToCalendar";
import Title from "@/components/shared/Title";
import { SponsorsClient } from "@/features/home";
import { getEventById } from "@/features/events/services/eventsApi";
import { formatSingleDate, openLocation } from "@/lib/helpers";
import { isViewerOrganizer } from "@/features/shared/opportunityButtonState";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { sanitizeRichText } from "@/lib/sanitizeRichText";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import EventFeedback from "./EventFeedback";
import { Fancybox as NativeFancybox } from "@fancyapps/ui";

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
  location_url?: string | null;
  from_age?: number;
  to_age?: number;
  /**
   * Fursa only announces events — the organizer runs registration on their own
   * channel (website, WhatsApp, Instagram), so this link is the entire
   * registration story on this screen. The API still returns
   * `registration_required` / `paid_registration` / `registration_fee` /
   * `is_registered`; they are deliberately not read here.
   */
  registration_link?: string;
  is_creator?: boolean;
  /** Per-viewer: "organizer" | "sponsor". */
  relationship_tags?: string[] | null;
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

  // Bind Fancybox to the event image gallery
  useEffect(() => {
    const galleryId = `event-gallery-${eventId}`;
    NativeFancybox.bind(`[data-fancybox="${galleryId}"]`, {
      showClass: "fancybox-zoomIn",
      hideClass: "fancybox-zoomOut",
    });
    return () => {
      NativeFancybox.unbind(`[data-fancybox="${galleryId}"]`);
      NativeFancybox.close();
    };
  }, [eventId]);

  const eventQuery = useQuery({
    queryKey: ["event-details", eventId, Boolean(user?.auth_token)],
    queryFn: () => getEventById({ id: eventId, passToken: Boolean(user?.auth_token) }),
    enabled: Boolean(eventId),
  });
  const event = eventQuery.data?.data as EventDetailsData | undefined;

  /**
   * `/events/{id}/` sends both `is_creator` and (since 2026-09-07)
   * `relationship_tags`, so ownership goes through the one shared derivation
   * every other detail screen uses — see BE-02 in `docs/BACKEND_ISSUES_ROUND_1.md`.
   * That keeps this screen working if `is_creator` is ever dropped here the way
   * it already was on the two opportunity resources.
   */
  const isCreator = isViewerOrganizer(event, user?.id);

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
  // The description is always shown in full — the View More toggle was removed.
  // Rendered as HTML, so it is sanitized first: the backend stores the editor's
  // markup verbatim and any organization account can author it.
  const description = sanitizeRichText(
    event.primary_language === "ar" ? event.description_ar : event.description_en
  );
  const displayValue = (value?: ChoiceDisplay) =>
    value?.[language === "ar" ? "value_ar" : "value_en"] || "";
  const isActive = event.event_status === "upcoming" || event.event_status === "inprogress";

  const goToEventForm = () => {
    const republish = event.event_status === "completed" || event.event_status === "inprogress";
    setNavState(NAV_STATE_KEYS.eventForm, {
      id: String(event.id),
      isRepublish: republish,
    });
    router.push("/event-form");
  };

  /**
   * Events are announcements only. The creator gets Edit/Repost; everyone else
   * gets the organizer's own registration link, opened externally. There is no
   * in-app register/unregister — the organizer collects sign-ups on their
   * website, WhatsApp or Instagram, so Fursa never holds a participation record.
   */
  const actionButton = (mobile = false) => {
    if (isCreator) {
      // Managing your own event isn't gated behind verification — the list
      // cards never hid it for an unverified creator either. A banned user
      // still can't.
      if (user?.is_banned) return null;
      const republish = event.event_status === "completed" || event.event_status === "inprogress";
      return (
        <Button
          size="medium"
          className={mobile ? "my-6 !h-14 !w-full" : "whitespace-nowrap"}
          onClick={goToEventForm}
        >
          {t(republish ? "COMMON.REPOST" : "COMMON.EDIT_TEXT")}
        </Button>
      );
    }

    if (event.registration_link && isActive) {
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
    return null;
  };

  const socialLinks = [
    ["facebook_link", "profile/facebook.svg", "Facebook"],
    ["twitter_link", "profile/twitter.svg", "Twitter"],
    ["whatsapp_link", "profile/whatsapp.svg", "WhatsApp"],
    ["instagram_link", "profile/instagram.svg", "Instagram"],
    ["linkedin_link", "profile/linkdin.svg", "LinkedIn"],
  ] as const;

  return (
    <div className="w-full">
      {/* {event.event_images?.length ? (
        <div className="relative h-[320px] w-full md:h-[460px]">
          {(event.event_images?.length ?? 0) > 1 ? (
            <Swiper
              modules={[Autoplay, Pagination]}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              loop
              pagination={{ clickable: true }}
              className="event-details-swiper h-full w-full"
            >
              {event.event_images!.map((img) => (
                <SwiperSlide key={img.id}>
                  <a
                    href={img.image}
                    data-fancybox={`event-gallery-${event.id}`}
                    data-caption={language === "ar" ? event.title_ar : event.title_en}
                    className="block h-full w-full cursor-zoom-in"
                  >
                    <img
                      src={img.image}
                      alt={language === "ar" ? event.title_ar : event.title_en}
                      className="h-full w-full object-cover"
                    />
                  </a>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            event.event_images?.[0] && (
              <a
                href={event.event_images?.[0]?.image}
                data-fancybox={`event-gallery-${event.id}`}
                data-caption={language === "ar" ? event.title_ar : event.title_en}
                className="block h-full w-full cursor-zoom-in"
              >
                <img
                  src={event.event_images?.[0]?.image}
                  alt={language === "ar" ? event.title_ar : event.title_en}
                  className="h-full w-full object-cover"
                />
              </a>
            )
          )}
        </div>
      ) : null} */}

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
              <div className="flex shrink-0 flex-col gap-3 xss:hidden">
                {actionButton()}
              </div>
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

            {/* Sits with the dates it copies — Google Calendar, or an .ics
                for Apple Calendar / Outlook. */}
            <div className="pb-5 mobilescreen:pb-3.5">
              <AddToCalendar
                payload={{
                  title_en: event.title_en,
                  title_ar: event.title_ar,
                  location_en: event.location_en,
                  location_ar: event.location_ar,
                  start_date: event.start_date,
                  end_date: event.end_date,
                  start_time: event.start_time,
                  end_time: event.end_time,
                }}
              />
            </div>

            <div className="mb-6 border-b">
              <div className="flex xss:flex-col">
                <div className="w-1/2 pt-5 xss:w-full">
                  <DetailRow icon={asset("homepage/locations.svg")}>
                    <button
                      type="button"
                      className="line-clamp-1 hover:underline"
                      title={language === "ar" ? event.location_ar : event.location_en}
                      onClick={() =>
                        openLocation(event.location_url, event.latitude, event.longitude)
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
                <div className="hidden xss:flex xss:flex-col xss:gap-3">
                  {actionButton(true)}
                </div>
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
              </div>
              <div
                className="text-sm font-semibold text-secondary-102 2xl:text-lg"
                dangerouslySetInnerHTML={{ __html: description }}
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

      {/*
        Replaces the full-bleed hero banner that used to sit at the top of the
        page. The banner only ever showed one photo (or auto-advanced through
        them), so the rest of the event's images were effectively invisible;
        this shows every one at once and opens the same Fancybox lightbox on
        click. Placed at the end of the event's own content, just above the
        sponsors band, so it doesn't compete with the details for the first
        screen of attention.

        4:5 rather than the square used by other thumbnail grids: these photos
        are cropped to 4:5 by the upload form, so rendering them at their native
        ratio avoids a second crop.
      */}
      {event.event_images?.length ? (
        <div className="mx-auto w-[90%] border-t pt-10 2xl:pt-[70px] mobilescreen:w-full">
          <h2 className="mb-8 text-center text-[28px] font-bold text-primary-5">
            {t("COMMON.GALLERY")}
          </h2>
          <div className="grid grid-cols-2 gap-3 pb-10 sm:grid-cols-3 lg:grid-cols-4 2xl:pb-[70px]">
            {event.event_images.map((img) => (
              <a
                key={img.id}
                href={img.image}
                data-fancybox={`event-gallery-${event.id}`}
                data-caption={language === "ar" ? event.title_ar : event.title_en}
                className="block cursor-zoom-in overflow-hidden rounded-lg"
                title={t("COMMON.CLICK_TO_VIEW")}
              >
                <img
                  src={img.image}
                  alt={language === "ar" ? event.title_ar : event.title_en}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-200 hover:scale-105"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t pt-10 2xl:pt-[70px]">
        <SponsorsClient />
      </div>
    </div>
  );
}
