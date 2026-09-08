"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import moment from "moment";
import Loader from "@/components/ui/Loader";
import Link from "next/link";
import { toast } from "sonner";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { Button } from "@/components/ui/Button";
import {
  downloadVolunteerDetail,
  getVolunteerDetail,
} from "@/features/achievements/services/achievementsApi";
import {
  getAllOpportunities,
  getUserOpportunities,
} from "@/features/opportunities/services/opportunities";
import {
  getAccountInfo,
  getQRCode,
  getVolunteerProfile,
} from "@/features/profile/services/profileApi";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";

const fadeStyles = `
.fade-table {
  transition: opacity 0.4s;
  opacity: 1;
}
.fade-table.fade-out {
  opacity: 0;
}
`;

/**
 * One line of the report's activity table. `/volunteer-detail/` supplies a
 * ready-made `year`; the opportunity and event list endpoints only carry dates,
 * so the year is derived from those.
 */
interface ActivityRow {
  key: string;
  title_en: string;
  title_ar: string;
  year?: number;
  kind: "opportunity" | "event";
}

/**
 * The slice of `GET /account/` this report renders. The endpoint returns far
 * more (birth year, nationality, emergency contact, …) — only the identity the
 * report is meant to certify is read here.
 */
interface AccountIdentity {
  profile_pic?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country_code?: string | null;
  civil_id?: string | null;
  gender_display?: { value_en?: string | null } | null;
}

interface ListedActivity {
  id?: number | string;
  title_en?: string;
  title_ar?: string;
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
}

const yearOf = (...dates: Array<string | null | undefined>) => {
  for (const date of dates) {
    if (!date) continue;
    const parsed = moment(date);
    if (parsed.isValid()) return parsed.year();
  }
  return undefined;
};

const toActivityRows = (
  items: unknown,
  kind: ActivityRow["kind"],
  keyPrefix: string
): ActivityRow[] =>
  (Array.isArray(items) ? (items as ListedActivity[]) : []).map(
    (item, index) => ({
      key: `${keyPrefix}-${item?.id ?? index}`,
      title_en: item?.title_en ?? "",
      title_ar: item?.title_ar ?? "",
      year: yearOf(item?.start_date, item?.end_date, item?.due_date),
      kind,
    })
  );

/**
 * The activity table paginates client-side over the merged opportunity/event
 * list, so every source is pulled in one page rather than page-by-page.
 */
const ACTIVITY_FETCH_LIMIT = 100;

/**
 * The list endpoints overlap (a registered opportunity is also an attended one
 * once it ends) and each numbers its rows separately, so identity is the
 * localized title plus the year rather than the id.
 */
const dedupeRows = (rows: ActivityRow[]): ActivityRow[] =>
  Array.from(
    new Map(
      rows.map((row) => [`${row.title_en}|${row.title_ar}|${row.year}`, row])
    ).values()
  );

const convertDecimalHoursToDisplay = (
  decimalHours: number | string | null | undefined
): string => {
  if (decimalHours === null || decimalHours === undefined) {
    return "0";
  }
  return decimalHours.toString();
};

export default function AchievementReports() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const headCellClass = `px-4 py-2 text-left text-[#181822CC] font-semibold text-xl border-b border-[#FC955587] ${
    isArabic ? "text-right" : ""
  }`;
  const bodyCellClass = `border-t border-b border-[#29246D] px-4 py-2 text-[#181822CC] ${
    isArabic ? "text-right" : ""
  }`;
  const user = useAuthStore((s) => s.user);
  const authToken = user?.auth_token;
  const [page, setPage] = useState(1);
  const [fade, setFade] = useState(false);
  const limit = 7;

  const { data, isLoading, error } = useQuery({
    queryKey: ["volunteerDetail"],
    queryFn: () => getVolunteerDetail({ page: 1, limit: ACTIVITY_FETCH_LIMIT }),
  });

  // Same two sources /volunteer-profile reads, so the identity and the
  // counters on the report match the profile screen instead of falling back to
  // placeholders when the report payload omits a field.
  const { data: volunteerProfileData } = useQuery({
    queryKey: ["volunteer-profile"],
    queryFn: getVolunteerProfile,
    enabled: Boolean(authToken),
  });

  const { data: accountInfoData } = useQuery({
    queryKey: ["account-info"],
    queryFn: getAccountInfo,
    enabled: Boolean(authToken),
  });

  // `/volunteer-profile/` carries no QR; the code lives on its own endpoint —
  // same query key as the QRCode screen so the two share one response.
  const { data: qrCodeData } = useQuery({
    queryKey: ["volunteer-qr-code"],
    queryFn: getQRCode,
    enabled: Boolean(authToken),
  });

  // `/volunteer-detail/` reports the counters but comes back with an empty
  // `opportunities` list, so the table is built from the same four requests
  // /volunteer-profile makes for its Opportunities and Events tabs. Each is
  // scoped to the signed-in user server-side — no `user_id` is sent, exactly as
  // on the profile, where that param is reserved for public profiles.
  //
  // `filter_type=myevents` is NOT usable here: `/list-all-opportunities/`
  // ignores it and answers with the global event list (every event on the
  // platform), which is why the events are requested the profile's way.
  const activityParams = { page: 1, limit: ACTIVITY_FETCH_LIMIT };

  const { data: registeredData, isLoading: isLoadingRegistered } = useQuery({
    queryKey: ["report-activities", "registered", activityParams],
    queryFn: () =>
      getUserOpportunities({ ...activityParams, filter_type: "registered" }),
    enabled: Boolean(authToken),
  });

  const { data: attendedData, isLoading: isLoadingAttended } = useQuery({
    queryKey: ["report-activities", "attended", activityParams],
    queryFn: () =>
      getUserOpportunities({ ...activityParams, filter_type: "organized" }),
    enabled: Boolean(authToken),
  });

  const { data: organizedEventsData, isLoading: isLoadingOrganizedEvents } =
    useQuery({
      queryKey: ["report-activities", "organized_events", activityParams],
      queryFn: () =>
        getAllOpportunities({
          ...activityParams,
          filter_type: "organized_events",
        }),
      enabled: Boolean(authToken),
    });

  const { data: sponsoredEventsData, isLoading: isLoadingSponsoredEvents } =
    useQuery({
      queryKey: ["report-activities", "sponsored_events", activityParams],
      queryFn: () =>
        getAllOpportunities({
          ...activityParams,
          filter_type: "sponsored_events",
        }),
      enabled: Boolean(authToken),
    });

  const exportMutation = useMutation({
    mutationFn: downloadVolunteerDetail,
  });

  // Report fields live under the standard `data` envelope key.
  const report = data?.data;
  const account: AccountIdentity | undefined = accountInfoData?.data;
  const profile = volunteerProfileData?.data;

  const fullName =
    report?.full_name ||
    account?.full_name ||
    [account?.first_name, account?.last_name].filter(Boolean).join(" ") ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  // `profile_pic` is null for anyone who never uploaded one, so the report
  // falls back to the gender avatar the profile header uses rather than to a
  // broken image.
  const profilePic =
    account?.profile_pic ||
    profile?.profile_pic ||
    getDefaultProfileImage(
      account?.gender_display?.value_en ??
        profile?.gender_display?.value_en ??
        undefined,
      "/assets/profile/male_profile.svg",
      "/assets/profile/female_profile.svg",
      "/assets/profile/org_profile.svg"
    );

  // Built as a list so a field the account never filled in is left out
  // entirely — a report certifying "الرقم المدني: -" is worse than one that
  // doesn't mention it. `ltr` keeps the phone and civil id from being reordered
  // around their digits when the page renders right-to-left.
  const identityRows: Array<{ label: string; value: string; ltr?: boolean }> = [
    { label: t("COMMON.EMAIL"), value: account?.email ?? "", ltr: true },
    {
      label: t("COMMON.PHONE"),
      value: [account?.country_code, account?.phone_number]
        .filter(Boolean)
        .join(" "),
      ltr: true,
    },
    { label: t("COMMON.CIVIL_ID"), value: account?.civil_id ?? "", ltr: true },
  ].filter((row) => Boolean(row.value));

  // `/volunteer-detail/` and `/volunteer-profile/` both answer with either a
  // nested `statistics` block or flat counters — prefer the nested one, exactly
  // like VolunteerBackgroundInformation does.
  const stats = {
    volunteerHours:
      report?.statistics?.all_time?.total_hours ??
      report?.total_volunteer_hours ??
      profile?.statistics?.all_time?.total_hours ??
      profile?.total_volunteer_hours ??
      0,
    volunteerOpportunities:
      report?.statistics?.all_time?.total_opportunities ??
      report?.total_opportunities ??
      profile?.statistics?.all_time?.total_opportunities ??
      profile?.total_opportunities ??
      0,
    certificates:
      report?.statistics?.all_time?.total_certificates ??
      report?.total_certificates ??
      profile?.statistics?.all_time?.total_certificates ??
      profile?.total_certificates ??
      0,
  };

  // `/volunteer-detail/` dates its own rows and wins whenever it returns any.
  const reportRows: ActivityRow[] = (report?.opportunities?.data ?? []).map(
    (opportunity, index) => ({
      key: `report-${index}`,
      title_en: opportunity.title_en,
      title_ar: opportunity.title_ar,
      year: opportunity.year,
      kind: "opportunity" as const,
    })
  );

  const opportunityRows = reportRows.length
    ? reportRows
    : dedupeRows([
        ...toActivityRows(registeredData?.data, "opportunity", "registered"),
        ...toActivityRows(attendedData?.data, "opportunity", "attended"),
      ]);

  // An event can be both organized and sponsored by the same account.
  const eventRows = dedupeRows([
    ...toActivityRows(organizedEventsData?.data, "event", "organized-event"),
    ...toActivityRows(sponsoredEventsData?.data, "event", "sponsored-event"),
  ]);

  // Newest first, then alphabetical so rows without a year sink to the bottom
  // instead of shuffling between renders.
  const activities = [...opportunityRows, ...eventRows].sort(
    (a, b) =>
      (b.year ?? 0) - (a.year ?? 0) || a.title_en.localeCompare(b.title_en)
  );

  const totalPages = Math.ceil(activities.length / limit);
  // A refetch can shrink the list under the current page; clamp rather than
  // showing an empty table on a page that no longer exists.
  const safePage = Math.min(page, Math.max(totalPages, 1));
  const pageRows = activities.slice((safePage - 1) * limit, safePage * limit);
  const isLoadingActivities =
    isLoadingRegistered ||
    isLoadingAttended ||
    isLoadingOrganizedEvents ||
    isLoadingSponsoredEvents;
  // The QR endpoint answers with the payload at the root on some revisions.
  const qrCodeUrl =
    report?.qr_code_url ||
    qrCodeData?.data?.qr_code_url ||
    qrCodeData?.qr_code_url;

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync();
      const pdfUrl = result?.data?.pdf_url;
      if (pdfUrl) {
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `achievement-report-${new Date().toISOString().split("T")[0]}.pdf`;

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success(t("COMMON.DOWNLOAD_SUCCESS"));
      } else {
        toast.error(t("COMMON.NO_PDF_URL"));
      }
    } catch (e) {
      console.error("Export error:", e);
      toast.error(t("COMMON.EXPORT_ERROR"));
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFade(true);
      setTimeout(() => {
        setPage(newPage);
        setTimeout(() => setFade(false), 50);
      }, 200);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div
      className={`bg-white shadow-md rounded-lg ${
        i18n.language === "ar" ? "rtl text-right font-arabic" : ""
      }`}
    >
      {/* Header */}
      <div
        className={`flex justify-between items-center h-[85px] bg-[#29246DD9] lg:px-[100px] md:px-[80px] 2xl:px-5 px-3 ${
          i18n.language === "ar" ? "flex-row-reverse" : ""
        }`}
      >
        {i18n.language === "ar" ? (
          <>
            <Link href="/">
              <img
                src="/assets/auth/logo_white.svg"
                className="lg:w-[140px] w-[140px] mobilescreen:w-[120px]"
                alt="Logo"
              />
            </Link>
            <h1 className="2xl:text-[36px] md:text-3xl text-3xl font-bold text-white xss:text-2xl font-arabic">
              {t("COMMON.ACHIVMENT.REPORT")}
            </h1>
          </>
        ) : (
          <>
            <h1 className="2xl:text-[36px] md:text-3xl text-3xl font-bold text-white xss:text-2xl mobilescreen1:text-[22px]">
              {t("COMMON.ACHIVMENT.REPORT")}
            </h1>
            <Link href="/">
              <img
                src="/assets/auth/logo_white.svg"
                className="lg:w-[140px] w-[140px] mobilescreen:w-[120px]"
                alt="Logo"
              />
            </Link>
          </>
        )}
      </div>

      {/* Identity */}
      <div
        className={`relative lg:py-8 py-8 flex flex-col items-center 2xl:px-5 px-3 2xl:px-32 lg:px-20 md:px-14 ${
          i18n.language === "ar" ? "font-arabic" : ""
        }`}
      >
        <img
          src={profilePic}
          alt={fullName || t("COMMON.FULL_NAME")}
          className="mb-4 h-[110px] w-[110px] rounded-full border-[3px] border-primary-5 object-cover"
        />
        <p
          className={`2xl:text-[36px] md:text-4xl text-3xl text-primary-5 font-bold pb-5 border-b border-primary-5 w-max mx-auto text-center ${
            i18n.language === "ar" ? "font-arabic" : ""
          }`}
        >
          {fullName || "-"}
        </p>

        {identityRows.length > 0 && (
          <dl className="mt-6 grid gap-x-12 gap-y-3 md:grid-cols-2">
            {identityRows.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-center gap-2"
              >
                <dt className="text-primary-5 font-bold text-lg mobilescreen:text-[16px]">
                  {row.label} :
                </dt>
                <dd
                  className="text-primary-5 text-lg break-all"
                  dir={row.ltr ? "ltr" : undefined}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <button
          className={`mt-4 lg:mt-0 w-auto min-w-[140px] bg-primary-5 text-white font-bold py-2 px-6 rounded shadow disabled:opacity-50 lg:absolute ${
            i18n.language === "ar" ? "lg:left-5" : "lg:right-5"
          } lg:top-1/2 lg:-translate-y-1/2 ${
            i18n.language === "ar" ? "font-arabic" : ""
          }`}
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          {t("COMMON.EXPORT_REPORT")}
        </button>
      </div>

      <div
        className={`2xl:px-32 lg:px-20 md:px-14 2xl:px-5 px-3 ${
          i18n.language === "ar" ? "font-arabic" : ""
        }`}
      >
        {/* Card */}
        <div>
          <h3
            className={`font-bold lg:text-4xl md:text-3xl text-3xl text-primary-5 pb-5 ${
              i18n.language === "ar" ? "font-arabic" : ""
            }`}
          >
            {t("COMMON.ACHIVMENTS")}
          </h3>
        </div>
        <div>
          <div
            className={`grid lg:grid-cols-3 md:grid-cols-2 xsl:grid-cols-2 grid-cols-1 xss:grid-cols-1 2xl:gap-[110px] lg:gap-[50px] md:gap-[30px] xsl:gap-5 xss:gap-5 pb-10 border-b-2 border-primary-5 ${
              i18n.language === "ar" ? "font-arabic" : ""
            }`}
          >
            <div className="border-[3px] border-primary-501 p-4 items-center flex flex-col shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]">
              <img
                className="h-[60px] mb-2"
                alt="Volunteer hours"
                src="/assets/profile/statistics/n_Volunteerhours.svg"
              />
              <h3 className="text-[30px] font-bold text-primary-501">
                {convertDecimalHoursToDisplay(stats.volunteerHours)}
              </h3>
              <p className="text-primary-501 font-semibold 2xl:text-base lg:text-sm pt-2 text-center">
                {t("COMMON.VOLUNTEER_HOURS")}
              </p>
            </div>
            <div className="border-[3px] border-primary-502 p-4 items-center flex flex-col shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]">
              <img
                className="h-[60px] mb-2 ml-[12px]"
                alt="Volunteer opportunities"
                src="/assets/profile/statistics/n_VolunteerOpportunities.svg"
              />
              <h3 className="text-[30px] font-bold text-primary-502">
                {stats.volunteerOpportunities}
              </h3>
              <p className="text-primary-502 font-semibold 2xl:text-base lg:text-sm pt-2 text-center">
                {t("COMMON.VOLUNTEER_OPPORTUNITIES")}
              </p>
            </div>
            <div className="border-[3px] border-primary-503 p-4 items-center flex flex-col shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]">
              <img
                className="h-[60px] mb-2"
                alt="Certificates"
                src="/assets/profile/statistics/n_Certificate.svg"
              />
              <h3 className="text-[30px] font-bold text-primary-503">
                {stats.certificates}
              </h3>
              <p className="text-primary-503 font-semibold 2xl:text-base lg:text-sm pt-2 text-center">
                {t("COMMON.CERTIFICATE")}
              </p>
            </div>
          </div>
        </div>

        {/* Opportunities & events */}
        <div className="pt-5">
          <h3
            className={`font-bold lg:text-4xl md:text-3xl text-3xl text-primary-5 pb-5 ${
              i18n.language === "ar" ? "font-arabic" : ""
            }`}
          >
            {t("COMMON.OPPORTUNITIES_AND_EVENTS")}
          </h3>
          <div className="overflow-x-auto">
            <table
              className={`min-w-full border-collapse ${
                i18n.language === "ar" ? "font-arabic" : ""
              }`}
            >
              <thead>
                <tr className="bg-[#FC955587]">
                  <th className={headCellClass}>{t("COMMON.NUMBER")}</th>
                  <th className={headCellClass}>{t("COMMON.NAME")}</th>
                  <th className={headCellClass}>{t("COMMON.TYPE")}</th>
                  <th className={headCellClass}>{t("COMMON.YEAR")}</th>
                </tr>
              </thead>
              <tbody
                className={`fade-table${fade ? " fade-out" : ""} ${
                  i18n.language === "ar" ? "font-arabic" : ""
                }`}
              >
                {error ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-red-500">
                      Failed to fetch data
                    </td>
                  </tr>
                ) : isLoadingActivities ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      {t("COMMON.LOADING")}
                    </td>
                  </tr>
                ) : pageRows.length > 0 ? (
                  pageRows.map((row, idx) => (
                    <tr key={row.key}>
                      <td className={bodyCellClass}>
                        {(safePage - 1) * limit + idx + 1}
                      </td>
                      <td className={bodyCellClass}>
                        {i18n.language === "ar" ? row.title_ar : row.title_en}
                      </td>
                      <td className={bodyCellClass}>
                        {row.kind === "event"
                          ? t("COMMON.EVENT")
                          : t("COMMON.OPPORTUNITY")}
                      </td>
                      <td className={bodyCellClass}>{row.year ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      {t("COMMON.NO_DATA")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <style>{fadeStyles}</style>

          {/* Pagination Controls */}
          {totalPages > 1 && (
              <div>
                <div className="flex justify-center items-center gap-4 mt-[40px]">
                  <Button
                    className="bg-primary-5 text-white p-2 rounded-full disabled:bg-gray-400 flex items-center justify-center"
                    variant="primary"
                    style={{ width: "40px", height: "40px" }}
                    disabled={page === 1}
                    onClick={() => handlePageChange(Math.max(page - 1, 1))}
                  >
                    <FaArrowLeft
                      className={i18n.language === "ar" ? "rotate-180" : ""}
                    />
                  </Button>
                  <span
                    className={`text-secondary-102 ${
                      i18n.language === "ar" ? "font-arabic" : ""
                    }`}
                  >
                    {t("COMMON.PAGE")} {safePage} {t("COMMON.OF")} {totalPages}
                  </span>
                  <Button
                    className="bg-primary-5 text-white p-2 rounded-full disabled:bg-gray-400 flex items-center justify-center"
                    variant="primary"
                    style={{ width: "40px", height: "40px" }}
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(Math.min(page + 1, totalPages))}
                  >
                    <FaArrowRight
                      className={i18n.language === "ar" ? "rotate-180" : ""}
                    />
                  </Button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <div
        className={`px-20 pt-[50px] lg:flex md:flex flex xss:flex-col gap-4 items-center justify-between pb-8 ${
          i18n.language === "ar" ? "flex-row-reverse font-arabic" : ""
        }`}
      >
        {i18n.language === "ar" ? (
          <>
            <div>
              <img
                src="/assets/auth/Trophy_perspective.svg"
                className="2xl:w-[150px] md:w-[150px] w-[100px]"
                alt="Trophy"
              />
            </div>
            <span className="text-center font-bold 2xl:text-[40px] md:text-3xl text-primary-5 mobilescreen:text-center font-arabic">
              {t("COMMON.COURSE.FOOTTER.TITLE")}
            </span>
            <img
              src={qrCodeUrl || "/assets/auth/qr.png"}
              alt="QR code"
              className="2xl:w-[150px] md:w-[150px] w-[100px]"
            />
          </>
        ) : (
          <>
            <img
              src={qrCodeUrl || "/assets/auth/qr.png"}
              alt="QR code"
              className="2xl:w-[150px] md:w-[150px] w-[100px]"
            />
            <span className="text-center font-bold 2xl:text-[40px] md:text-3xl text-primary-5 mobilescreen:text-center">
              {t("COMMON.COURSE.FOOTTER.TITLE")}
            </span>
            <div>
              <img
                src="/assets/auth/Trophy_perspective.svg"
                className="2xl:w-[150px] md:w-[150px] w-[100px]"
                alt="Trophy"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
