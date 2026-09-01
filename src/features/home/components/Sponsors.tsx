/**
 * Sponsors — Server Component
 *
 * Fetches sponsor logos on the server (ISR, 5 min cache) and passes the
 * list to SponsorsMarquee which handles the CSS marquee animation client-side.
 *
 * The section heading is translated client-side via the i18n provider that
 * wraps the whole app — no useTranslation hook needed here.
 */
import { fetchSponsors } from "@/features/home/services/server";
import SponsorsMarquee from "@/features/home/components/SponsorsMarquee";
import SponsorsHeading from "@/features/home/components/SponsorsHeading";

export default async function Sponsors() {
  const sponsors = await fetchSponsors();

  return (
    <div className="w-full relative 2xl:pb-[70px] lg:pb-[40px] mobilescreen:pb-[40px] pb-[40px] mx-auto 2xl:px-0 sponsors">
      <div className="mb-[25px] 2xl:mb-[50px] laptop:mb-[40px] lg:mb-[24px] md:mb-[30px]">
        <SponsorsHeading />
      </div>

      {sponsors.length > 0 && <SponsorsMarquee sponsors={sponsors} />}
    </div>
  );
}
