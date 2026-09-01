"use client";

/**
 * The certificate is a page, not a lightbox: it used to be `fixed inset-0`,
 * which painted over the Header and Footer of the (main) layout. It now flows
 * with the page content inside the same container the other screens use.
 */
export default function Certificate() {
  return (
    <div className="w-full border-t border-[#000]">
      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]">
        <div className="flex items-center justify-center rounded-[20px] bg-[#29246D]/[0.03] p-4 mobilescreen:p-3">
          <img
            src="/assets/opportunities/Forsa_certificate.svg"
            alt="Certificate"
            className="block h-auto max-h-[80vh] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
