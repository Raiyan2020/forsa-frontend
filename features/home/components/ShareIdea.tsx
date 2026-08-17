"use client";

/**
 * "Share an idea" block — admin-editable (`GET /home/` → `share_idea`).
 * Renders nothing when the CMS has no content for it.
 */
import Link from "next/link";
import Image from "next/image";
import { useLanguageStore } from "@/store/languageStore";
import { useHomeCms } from "@/features/cms/hooks/useHomeCms";
import { pickLocalized, type ShareIdeaCms } from "@/lib/api/cms";
import Title from "./Title";

export default function ShareIdea({ data }: { data?: ShareIdeaCms | null }) {
  const language = useLanguageStore((s) => s.language);
  const { cms } = useHomeCms({ enabled: data === undefined });

  const share = data ?? cms?.share_idea ?? null;
  const title = pickLocalized(share?.title_en, share?.title_ar, language);
  const description = pickLocalized(
    share?.description_en,
    share?.description_ar,
    language
  );

  if (!share || (!title && !description && !share.image)) return null;

  return (
    <div className="2xl:py-[70px] laptopmain:py-[50px] mobilescreen:py-[40px] py-[40px] bg-primary-5">
      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] flex flex-col md:flex-row items-center mx-auto rtl:gap-10 mobilescreen:rtl:gap-0">
        {share.image && (
          <div className="w-full md:w-1/2 flex justify-center relative min-h-[250px] md:min-h-[350px]">
            <Image
              src={share.image}
              alt={title || ""}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
            />
          </div>
        )}
        <div
          className={`w-full mt-6 md:mt-0 md:pl-10 mobilescreen:pl-[15px] ${
            share.image ? "md:w-1/2" : "md:w-full"
          }`}
        >
          {title && (
            <div>
              <Link href="/community">
                <h2>
                  <Title className="text-start" text={title} variant="green" />
                </h2>
              </Link>
            </div>
          )}
          {description && (
            <Link href="/community">
              <p className="text-white 2xl:text-[32px] laptopmain:text-[28px] laptopmain:leading-[38px] laptop:text-[28px] laptop:leading-[42px] 2xl:leading-[60px] lg:text-[20px] md:text-lg sm:text-[28px] lg:leading-[32px] md:leading-[30px] mobilescreen:leading-[32px]">
                {description}
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
