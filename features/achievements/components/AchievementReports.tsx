"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import Loader from "@/components/ui/Loader";
import Link from "next/link";
import { toast } from "sonner";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { Button } from "@/components/ui/Button";
import { getVolunteerDetail } from "@/features/services/api";

const fadeStyles = `
.fade-table {
  transition: opacity 0.4s;
  opacity: 1;
}
.fade-table.fade-out {
  opacity: 0;
}
`;

const convertDecimalHoursToDisplay = (
  decimalHours: number | null | undefined
): string => {
  if (decimalHours === null || decimalHours === undefined) {
    return "0";
  }
  return decimalHours.toString();
};

export default function AchievementReports() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [fade, setFade] = useState(false);
  const limit = 7;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["volunteerDetail", page, limit],
    queryFn: () => getVolunteerDetail({ page, limit }),
  });

  const exportMutation = useMutation({
    mutationFn: () => getVolunteerDetail({ download: true }),
  });

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
    if (
      data &&
      data.opportunities &&
      newPage >= 1 &&
      newPage <= data.opportunities.meta.pagination.total_pages
    ) {
      setFade(true);
      setTimeout(() => {
        setPage(newPage);
        setTimeout(() => {
          refetch();
          setFade(false);
        }, 50);
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

      {/* Name */}
      <div
        className={`relative lg:py-8 py-8 flex flex-col items-center 2xl:px-5 px-3 2xl:px-32 lg:px-20 md:px-14 ${
          i18n.language === "ar" ? "font-arabic" : ""
        }`}
      >
        <p
          className={`2xl:text-[36px] md:text-4xl text-3xl text-primary-5 font-bold pb-5 border-b border-primary-5 w-max mx-auto ${
            i18n.language === "ar" ? "font-arabic" : ""
          }`}
        >
          {isLoading ? "..." : data?.full_name || "-"}
        </p>
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
                {isLoading ? "0" : convertDecimalHoursToDisplay(data?.total_volunteer_hours)}
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
                {isLoading ? 0 : data?.total_opportunities ?? 0}
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
                {isLoading ? 0 : data?.total_certificates ?? 0}
              </h3>
              <p className="text-primary-503 font-semibold 2xl:text-base lg:text-sm pt-2 text-center">
                {t("COMMON.CERTIFICATE")}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="pt-5">
          <h3
            className={`font-bold lg:text-4xl md:text-3xl text-3xl text-primary-5 pb-5 ${
              i18n.language === "ar" ? "font-arabic" : ""
            }`}
          >
            {t("COMMON.COURSES")}
          </h3>
          <div className="overflow-x-auto">
            <table
              className={`min-w-full border-collapse ${
                i18n.language === "ar" ? "font-arabic" : ""
              }`}
            >
              <thead>
                <tr className="bg-[#FC955587]">
                  <th
                    className={`px-4 py-2 text-left text-[#181822CC] font-semibold text-xl border-b border-[#FC955587] ${
                      i18n.language === "ar" ? "text-right" : ""
                    }`}
                  >
                    {t("COMMON.NUMBER")}
                  </th>
                  <th
                    className={`px-4 py-2 text-left text-[#181822CC] font-semibold text-xl border-b border-[#FC955587] ${
                      i18n.language === "ar" ? "text-right" : ""
                    }`}
                  >
                    {t("COMMON.COURSES.NAME")}
                  </th>
                  <th
                    className={`px-4 py-2 text-left text-[#181822CC] font-semibold text-xl border-b border-[#FC955587] ${
                      i18n.language === "ar" ? "text-right" : ""
                    }`}
                  >
                    {t("COMMON.YEAR")}
                  </th>
                </tr>
              </thead>
              <tbody
                className={`fade-table${fade ? " fade-out" : ""} ${
                  i18n.language === "ar" ? "font-arabic" : ""
                }`}
              >
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      {t("COMMON.LOADING")}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-red-500">
                      Failed to fetch data
                    </td>
                  </tr>
                ) : data &&
                  data.opportunities &&
                  data.opportunities.data.length > 0 ? (
                  data.opportunities.data.map(
                    (
                      c: { title_ar: string; title_en: string; year: number },
                      idx: number
                    ) => (
                      <tr key={idx}>
                        <td
                          className={`border-t border-b border-[#29246D] px-4 py-2 text-[#181822CC] ${
                            i18n.language === "ar" ? "text-right" : ""
                          }`}
                        >
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td
                          className={`border-t border-b border-[#29246D] px-4 py-2 text-[#181822CC] ${
                            i18n.language === "ar" ? "text-right" : ""
                          }`}
                        >
                          {i18n.language === "ar" ? c.title_ar : c.title_en}
                        </td>
                        <td
                          className={`border-t border-b border-[#29246D] px-4 py-2 text-[#181822CC] ${
                            i18n.language === "ar" ? "text-right" : ""
                          }`}
                        >
                          {c.year}
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      {t("COMMON.NO_DATA")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <style>{fadeStyles}</style>

          {/* Pagination Controls */}
          {data &&
            data.opportunities &&
            data.opportunities.meta.pagination.total_pages > 1 && (
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
                    {t("COMMON.PAGE")} {page} {t("COMMON.OF")}{" "}
                    {data.opportunities.meta.pagination.total_pages}
                  </span>
                  <Button
                    className="bg-primary-5 text-white p-2 rounded-full disabled:bg-gray-400 flex items-center justify-center"
                    variant="primary"
                    style={{ width: "40px", height: "40px" }}
                    disabled={
                      page === data.opportunities.meta.pagination.total_pages
                    }
                    onClick={() =>
                      handlePageChange(
                        Math.min(
                          page + 1,
                          data.opportunities.meta.pagination.total_pages
                        )
                      )
                    }
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
              src={isLoading ? "/assets/auth/qr.png" : data?.qr_code_url || "/assets/auth/qr.png"}
              alt="QR code"
              className="2xl:w-[150px] md:w-[150px] w-[100px]"
            />
          </>
        ) : (
          <>
            <img
              src={isLoading ? "/assets/auth/qr.png" : data?.qr_code_url || "/assets/auth/qr.png"}
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
