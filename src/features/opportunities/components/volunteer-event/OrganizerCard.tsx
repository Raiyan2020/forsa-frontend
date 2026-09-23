"use client";

/* eslint-disable @next/next/no-img-element -- remote avatars and static
   icons; `next/image` is effectively `<img>` here (`images.unoptimized`). */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { IoIosShareAlt } from "react-icons/io";
import { getDefaultProfileImage, handleShare } from "@/lib/helpers";
import type { OpportunityCreator, VolunteerOpportunityDetail } from "./types";
import { organizerProfilePath } from "./volunteerEventView";

const SOCIAL_LINKS = [
  { key: "facebook_link", icon: "/assets/profile/facebook.svg" },
  { key: "twitter_link", icon: "/assets/profile/twitter.svg" },
  { key: "whatsapp_link", icon: "/assets/profile/whatsapp.svg" },
  { key: "instagram_link", icon: "/assets/profile/instagram.svg" },
  { key: "linkedin_link", icon: "/assets/profile/linkdin.svg" },
] as const satisfies ReadonlyArray<{ key: keyof OpportunityCreator; icon: string }>;

interface OrganizerCardProps {
  data: VolunteerOpportunityDetail;
  isCreator: boolean;
}

/** Avatar, name, the opportunity's own WhatsApp line, social links and Share. */
export default function OrganizerCard({ data, isCreator }: OrganizerCardProps) {
  const { t } = useTranslation();
  const creator = data.created_by;
  const profilePath = organizerProfilePath(creator);

  const socialLinks = SOCIAL_LINKS.flatMap(({ key, icon }) => {
    const href = creator?.[key];
    return href ? [{ key, icon, href }] : [];
  });

  return (
    <div className="flex flex-col items-center">
      <Link href={profilePath}>
        <img
          src={
            creator?.profile_pic ||
            getDefaultProfileImage(
              creator?.gender_display?.value_en ?? undefined,
              "/assets/profile/male_profile.svg",
              "/assets/profile/female_profile.svg",
              "/assets/profile/org_profile.svg"
            )
          }
          alt={creator?.full_name ?? ""}
          className="bg-white relative z-10 2xl:w-[300px] lg:w-[200px] w-[200px] xss:w-[130px] 2xl:h-[300px] lg:h-[200px] h-[200px] xss:h-[130px] object-cover rounded-full border-2 border-primary-5"
        />
      </Link>

      <div className="w-[100%] flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] bottom-[50px] lg:pt-[137px] md:pt-[80px] pt-[80px] lg:bottom-[100px] px-[20px] 2xl:pb-[70px] lg:pb-[40px] pb-[40px]">
        <Link href={profilePath}>
          <div className="w-[252px] text-center shadow-[0px_4px_4px_0px_#00000040] bg-primary-5 rounded-[20px] text-white p-[24px]">
            <h3 className="2xl:text-xl lg:text-base text-base font-bold text-white">
              {creator?.full_name}
            </h3>
          </div>
        </Link>

        <div className="w-full pt-8 text-center">
          {/*
            `link` is THIS opportunity's WhatsApp contact (the form's required
            «رابط واتساب»), not the organization's profile WhatsApp — that is
            an icon in the row below. A volunteer asking about one opportunity
            should reach whoever runs it, not the org's general line. Labelled,
            because an unlabelled glyph beside the profile's identical glyph
            tells nobody which is which. Hidden from the creator, who would be
            messaging themselves.
          */}
          {!isCreator && data.link ? (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-[20px] bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
            >
              <img
                src="/assets/profile/whatsapp.svg"
                alt=""
                className="h-5 w-5 brightness-0 invert"
              />
              {t("COMMON.CONTACT_VIA_WHATSAPP")}
            </a>
          ) : null}

          {socialLinks.length > 0 && (
            <div className="mt-3 flex gap-3 justify-center">
              {socialLinks.map(({ key, icon, href }) => (
                <a key={key} target="_blank" rel="noopener noreferrer" href={href}>
                  <img className="w-[31px] h-[31px]" src={icon} alt="" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* A private opportunity is reachable only by its link, so the
            creator gets a way to hand it out. */}
        {isCreator && !data.is_public && (
          <button
            type="button"
            onClick={() => handleShare(data.registration_link || "", t)}
            className="mt-[50px] mobilescreen:mt-[30px] flex items-center text-primary-200 font-medium"
          >
            <span className="mr-1 flex gap-2 text-primary-5 items-center 2xl:text-xl lg:text-base text-base font-bold">
              <IoIosShareAlt className="w-6 h-6" />
              {t("COMMON.SHARE")}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
