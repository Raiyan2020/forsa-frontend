"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Loader from "@/components/ui/Loader";
import { getQRCode } from "@/features/profile/services/profileApi";
import { useLanguageStore } from "@/store/languageStore";

interface QRCodeData {
  qr_code_url?: string;
  name?: string;
  manual_id?: string;
  volunteer_id?: number;
}

export default function QRCode() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);

  const { data, isLoading, error } = useQuery<QRCodeData>({
    queryKey: ["volunteer-qr-code"],
    queryFn: async () => {
      const response = await getQRCode();
      // The endpoint returns the payload either at the root or under `data`.
      return response?.data ?? response ?? {};
    },
  });

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <div>{t("COMMON.ERROR_LOADING_QR_CODE")}</div>;
  }

  const qrCodeUrl = data?.qr_code_url || "";
  const name = data?.name || "";
  const manualId = data?.manual_id || "";

  return (
    <div className="">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]">
        <div className="">
          <div className="flex justify-center mb-8">
            {/* Remote QR images are served straight from the API host and are not
                a layout-critical asset, so a plain <img> avoids the optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="2x:h-[433px] lg:h-[300px] md:h-[300px] h-auto w-auto border-[6px] border-[#29246D] rounded-[16px] qrscreenswidth"
            />
          </div>
          <div className="text-lg text-primary-5 flex justify-center">
            <div className={language === "ar" ? "text-right" : "text-left"}>
              <p className="font-semibold">
                {t("COMMON.NAME")}
                <span className="pl-2">:</span>
                <span className="pl-2 font-normal">{name}</span>
              </p>
              <p className="font-semibold mt-2">
                {t("COMMON.ID")}
                <span className="pl-2">:</span>
                <span className="pl-2 font-normal">{manualId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
