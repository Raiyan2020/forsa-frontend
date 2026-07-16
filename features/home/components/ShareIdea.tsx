"use client";

import { useTranslation } from "react-i18next";
import Title from "./Title";
import Link from "next/link";
import Image from "next/image";

export default function ShareIdea() {
  const { t } = useTranslation();

  return (
    <div className="2xl:py-[70px] laptopmain:py-[50px] mobilescreen:py-[40px] py-[40px] bg-primary-5">
      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] flex flex-col md:flex-row items-center mx-auto rtl:gap-10 mobilescreen:rtl:gap-0">
        <div className="w-full md:w-1/2 flex justify-center relative min-h-[250px] md:min-h-[350px]">
          <Image
            src="/assets/homepage/shareidea.png"
            alt={t("COMMON.SHAREIDEA") || "Share an Idea"}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
          />
        </div>
        <div className="w-full md:w-1/2 mt-6 md:mt-0 md:pl-10 mobilescreen:pl-[15px]">
          <div>
            <Link href="/community">
              <h2>
                <Title
                  className="text-start"
                  text={t("COMMON.SHAREIDEA")}
                  variant="green"
                />
              </h2>
            </Link>
          </div>
          <Link href="/community">
            <p className="text-white 2xl:text-[32px] laptopmain:text-[28px] laptopmain:leading-[38px] laptop:text-[28px] laptop:leading-[42px] 2xl:leading-[60px] lg:text-[20px] md:text-lg sm:text-[28px] lg:leading-[32px] md:leading-[30px] mobilescreen:leading-[32px]">
              {t("COMMON.SHAREIDEA_DETAILS")}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

