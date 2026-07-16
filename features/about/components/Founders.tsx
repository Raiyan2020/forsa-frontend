"use client";

import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";
import Image from "next/image";

export default function Founders() {
  const { t } = useTranslation();

  const founders = [
    {
      name: "Hind Al-Jasser",
      role: t("ABOUT.FOUNDERS.CEO"),
      subject: t("ABOUT.FOUNDERS.CEO_SUBJECT"),
      image: "/assets/sponser/founder_hind.png",
      bio1: t("ABOUT.FOUNDERS.HIND_BIO_1"),
      bio2: t("ABOUT.FOUNDERS.HIND_BIO_2"),
      bio3: t("ABOUT.FOUNDERS.HIND_BIO_3"),
    },
    {
      name: "Khaled Essam Al-Otaibi",
      role: t("ABOUT.FOUNDERS.CO_FOUNDER"),
      subject: t("ABOUT.FOUNDERS.CO_FOUNDER_SUBJECT"),
      image: "/assets/sponser/founder_Khaled.svg",
      bio1: t("ABOUT.FOUNDERS.KHALED_BIO_1"),
      bio2: t("ABOUT.FOUNDERS.KHALED_BIO_2"),
      bio3: t("ABOUT.FOUNDERS.KHALED_BIO_3"),
    },
  ];

  return (
    <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:pt-[70px] laptopmain:2xl:pt-[40px] pt-[40px] relative">
      <h1 className="mb-[100px]">
        <Title text={t("ABOUT.FOUNDERS.TITLE")} variant="default" />
      </h1>
      <div className="flex flex-col md:flex-row gap-8 mobilescreen:gap-20 items-stretch">
        {founders.map((founder, index) => (
          <div
            key={index}
            className="relative flex-1 flex flex-col items-center min-h-[420px]"
          >
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
              <div className="rounded-full overflow-hidden">
                <Image
                  src={founder.image}
                  alt={founder.name}
                  width={140}
                  height={140}
                  className="object-cover w-[140px] h-[140px] rounded-full border-8 border-[#F3F2F6]"
                  unoptimized
                />
              </div>
            </div>
            <div className="bg-[#29246d] text-white rounded-[30px] px-9 xss:px-4 pb-14 mobilescreen:pb-10 pt-20 h-full flex flex-col justify-start">
              <h3 className="2xl:text-3xl text-xl font-bold text-center mb-1 pb-5 lg:pb-[33px] md:pb-6">
                {founder.name}
              </h3>
              <p className="text-center 2xl:text-2xl laptopmain:text-lg xss:text-base mb-5 text-gray-300 lg:mb-[38px] md:mb-6 text-white font-semibold">
                {founder.role}
              </p>
              <p className="text-gray-100 lg:text-xl xss:text-[16px] xss:leading-[26px] text-[18px]">
                {founder.subject}
              </p>
              <p className="text-gray-100 lg:text-xl xss:text-[16px] xss:leading-[26px] text-[18px]">
                {founder.bio1}
              </p>
              <p className="text-gray-100 lg:text-xl xss:text-[16px] xss:leading-[26px] text-[18px]">
                {founder.bio2}
              </p>
              <p className="text-gray-100 lg:text-xl xss:text-[16px] xss:leading-[26px] text-[18px]">
                {founder.bio3}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
