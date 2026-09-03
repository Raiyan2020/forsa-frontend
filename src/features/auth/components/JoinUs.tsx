"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/languageStore";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";

export default function JoinUs() {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState("individual");
  const [userData, setUserData] = useState<any>(null);

  // Set default selection and retrieve stored user info if redirected from social OAuth
  useEffect(() => {
    const stored = sessionStorage.getItem("oauth_user");
    if (stored) {
      setUserData(JSON.parse(stored));
    }
  }, []);

  const handleOptionChange = (option: string) => {
    setSelectedOption(option);
  };

  const handleNextClick = () => {
    if (userData) {
      if (selectedOption === "individual") {
        router.push("/volunteer-mandate-details");
      } else {
        if (selectedOption === "volunteer-team") {
          setNavState(NAV_STATE_KEYS.joinAsVolunteerTeam, true);
        }
        router.push("/complete-details");
      }
    }
  };

  return (
    <div className="border-t border-[#000]">
      <div className="joinus flex flex-col items-center justify-center 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] text-center mobilescreen:w-[90%] mobilescreen:m-auto">
        <h2 className="mobilescreen:pb-10 font-bold xs:text-[22px] xs:leading-[26px] text-[28px] leading-[48px] md:text-[32px] md:leading-[52px] lg:text-[30px] lg:leading-[60px] 2xl:text-[50px] xl:leading-[68.09px] tracking-[0px] text-[#29246D]">
          {t("COMMON.JOINUS.TITLE-")}
        </h2>

        <p className={`xs:text-base xs:w-full text-[25px] lg:text-[18px] mobilescreen:text-[18px] text-[#29246D] w-[80%] 2xl:w-[65%] xl:w-[85%] lg:w-[85%] ${selectedLanguage === "ar" ? "mt-[7px]" : ""}`}>
          {t("COMMON.JOINUS.SUBTITLE")}
        </p>

        <div className="flex xs:block 2xl:pt-11 lg:pt-5 pt-5 gap-2 lg:gap-0 md:gap-0 sm:gap-5 items-center rtl:gap-[10px]">
          {/* Individual Option */}
          <label className="cursor-pointer">
            <input
              type="radio"
              name="role"
              className="hidden peer"
              checked={selectedOption === "individual"}
              onChange={() => handleOptionChange("individual")}
            />
            <div className="xs:mb-5 xs:w-[300px] w-[195px] h-[155px] sm:w-[235px] sm:h-[180px] lg:w-[221px] lg:h-[200px] 2xl:h-[224px] border border-primary-5 rounded-[20px] flex flex-col items-center justify-center p-4 peer-checked:border-2 peer-checked:border-primary-5 peer-checked:shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] transition-all">
              <img
                src="/assets/auth/individual.svg"
                alt="individual"
                className="mx-auto mb-[14px] rounded"
              />
              <p className="font-bold lg:text-[28px] md:text-[30px] text-[24px] xs:text-[18px] leading-[40.85px] tracking-[0px] text-primary-5">
                {t("COMMON.VOLUNTEER--")}
              </p>
            </div>
          </label>

          {/* Volunteer Team Option */}
          <label className={`cursor-pointer ${selectedLanguage === "ar" ? "lg:pr-[37px] md:pr-[37px] pr-[0px]" : "lg:pl-[37px] md:pl-[37px] pl-[0px]"}`}>
            <input
              type="radio"
              name="role"
              className="hidden peer"
              checked={selectedOption === "volunteer-team"}
              onChange={() => handleOptionChange("volunteer-team")}
            />
            <div className="xs:w-[300px] w-[195px] xs:mb-5 h-[155px] sm:w-[235px] sm:h-[180px] lg:w-[221px] lg:h-[200px] 2xl:h-[224px] border border-primary-5 rounded-[20px] flex flex-col items-center justify-center p-4 peer-checked:border-2 peer-checked:border-primary-5 peer-checked:shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] transition-all">
              <img
                src="/assets/auth/team.svg"
                alt="volunteerteamicn"
                className="mx-auto mb-[14px] rounded w-[70px] h-[70px] object-contain"
              />
              <p className="font-bold lg:text-[28px] md:text-[30px] text-[24px] xs:text-[18px] leading-[40.85px] tracking-[0px] text-primary-5">
                {t("COMMON.JOINUS.VOLUNTEER_TEAM")}
              </p>
            </div>
          </label>

          {/* Organizer Option */}
          <label className={`cursor-pointer ${selectedLanguage === "ar" ? "lg:pr-[37px] md:pr-[37px] pr-[0px]" : "lg:pl-[37px] md:pl-[37px] pl-[0px]"}`}>
            <input
              type="radio"
              name="role"
              className="hidden peer"
              checked={selectedOption === "organizer"}
              onChange={() => handleOptionChange("organizer")}
            />
            <div className="xs:w-[300px] w-[195px] xs:mb-5 h-[155px] sm:w-[235px] sm:h-[180px] lg:w-[221px] lg:h-[200px] 2xl:h-[224px] border border-primary-5 rounded-[20px] flex flex-col items-center justify-center p-4 peer-checked:border-2 peer-checked:border-primary-5 peer-checked:shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] transition-all">
              <img
                src="/assets/auth/organizer.svg"
                alt="organizericn"
                className="mx-auto mb-[14px] rounded"
              />
              <p className="font-bold lg:text-[28px] md:text-[30px] text-[24px] xs:text-[18px] leading-[40.85px] tracking-[0px] text-primary-5">
                {t("COMMON.ORGANIZATIONS")}-{t("COMMON.TEAM")}
              </p>
            </div>
          </label>
        </div>

        {userData ? (
          <Button
            variant="primary"
            size="medium"
            className="mt-[40px] xss:mt-5"
            onClick={handleNextClick}
          >
            <span>{t("COMMON.NEXT")}</span>
          </Button>
        ) : (
          <Link
            href={
              selectedOption === "individual"
                ? "/individual-form"
                : "/entities-form"
            }
            onClick={() => {
              if (selectedOption === "volunteer-team") {
                setNavState(NAV_STATE_KEYS.joinAsVolunteerTeam, true);
              }
            }}
          >
            <Button variant="primary" size="medium" className="mt-[40px]">
              <span>{t("COMMON.NEXT")}</span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
